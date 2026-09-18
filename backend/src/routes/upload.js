import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { readWorkbook } from '../lib/excel.js';
import { hsName } from '../lib/hs.js';
import { getCatalog, publishRevisions } from '../lib/store.js';
import { putPending, takePending, dropPending } from '../lib/pending.js';
import { UPLOAD_DIR } from '../config.js';

const router = Router();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['.xlsx', '.xls', '.csv']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      cb(null, `${stamp}__${file.originalname.replace(/[^\w.\- ]+/g, '_')}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new Error('Upload an .xlsx, .xls or .csv price list.'));
    cb(null, true);
  },
});

/** Latest priced value in a parsed row, newest revision first. */
const latestPrice = (hist) => hist[2] ?? hist[1] ?? hist[0] ?? null;

/** What each price slot the parser fills actually represents. */
const SLOT_LABELS = ['Old MRP', 'Revised MRP', 'Latest MRP'];

/**
 * Which price slots this file actually carries. A workbook with an OLD MRP and
 * a NEW MRP column holds its own history; a plain current price list holds one
 * slot. This is what decides whether the comparison comes from inside the file
 * or from the catalog already in the database.
 */
function populatedSlots(rows) {
  const slots = [];
  for (let i = 0; i < SLOT_LABELS.length; i++) {
    if (rows.some((r) => r.hist[i] != null)) slots.push(i);
  }
  return slots;
}

/**
 * Step 1 of 2: parse and diff an uploaded price list, and hold it.
 *
 * Nothing is written to the database here. The diff comes back with a
 * `pendingId`, and the prices only become current when that id is posted to
 * /publish — so a wrong file can be seen and discarded before it does harm.
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file was received.' });

  let parsed;
  try {
    parsed = readWorkbook(req.file.path);
  } catch (err) {
    return res.status(422).json({ error: `That file could not be read: ${err.message}` });
  }

  if (!parsed.rows.length) {
    return res.status(422).json({
      error: 'No priced rows were found. Expected columns: PART_NUM, ROOT_PART_NUM, PART_DESC, MRP, TAX_DESC, HS_CODE.',
    });
  }

  const cat = getCatalog();
  const slots = populatedSlots(parsed.rows);
  const carriesHistory = slots.length > 1;

  // A file holding several price columns is its own history: the last two are
  // compared against each other. A single-column list is compared against the
  // catalog already in the database, as before.
  const curSlot = slots.at(-1);
  const prevSlot = carriesHistory ? slots.at(-2) : null;

  const counts = { up: 0, down: 0, same: 0, new: 0, dropped: 0 };
  const diff = [];
  const seen = new Set();

  for (const row of parsed.rows) {
    const cur = carriesHistory ? row.hist[curSlot] : latestPrice(row.hist);
    if (cur == null) continue;
    seen.add(row.partNo);

    const existing = cat.byPartNo.get(row.partNo);
    const prev = carriesHistory
      ? row.hist[prevSlot]
      : existing ? existing.cur ?? existing.prev : null;
    const status = prev == null ? 'new' : cur > prev ? 'up' : cur < prev ? 'down' : 'same';
    counts[status]++;

    diff.push({
      partNo: row.partNo,
      root: row.root || existing?.root || row.partNo,
      desc: row.desc || existing?.desc || '',
      hs: row.hs || existing?.hs || '',
      cat: hsName(row.hs || existing?.hs || ''),
      tax: row.tax ?? existing?.tax ?? null,
      prev,
      cur,
      status,
      delta: prev == null ? null : cur - prev,
      pct: prev ? ((cur - prev) / prev) * 100 : null,
    });
  }

  // Only meaningful when comparing against the catalog; a file that carries its
  // own history says nothing about parts outside it.
  if (!carriesHistory) {
    for (const p of cat.parts) {
      if (p.cur != null && !seen.has(p.partNo)) counts.dropped++;
    }
  }

  const matched = counts.up + counts.down + counts.same;
  const byDelta = diff.filter((d) => d.pct != null);
  const topUp = byDelta.filter((d) => d.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5);
  const topDown = byDelta.filter((d) => d.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5);

  // One revision per price column the file carries, oldest first, so a
  // workbook holding old and new prices lands as real history rather than a
  // single flattened list.
  const details = new Map(
    diff.map((d) => [d.partNo, { root: d.root, desc: d.desc, hs: d.hs, tax: d.tax }]),
  );

  const revisions = slots.map((slot, i) => {
    const rows = [];
    let up = 0, down = 0, nw = 0;
    for (const row of parsed.rows) {
      const price = row.hist[slot];
      if (price == null) continue;
      const before = i > 0 ? row.hist[slots[i - 1]] : null;
      if (before == null) nw++;
      else if (price > before) up++;
      else if (price < before) down++;
      const d = details.get(row.partNo);
      rows.push({
        partNo: row.partNo,
        root: d?.root || row.root || row.partNo,
        desc: d?.desc || row.desc || '',
        hs: d?.hs || row.hs || '',
        tax: d?.tax ?? row.tax ?? null,
        price,
      });
    }
    return {
      name: carriesHistory
        ? `${req.file.originalname} · ${SLOT_LABELS[slot]}`
        : req.file.originalname,
      source: `${req.file.originalname} · ${parsed.sheetNames.join(', ')}`,
      counts: { up, down, new: nw },
      rows,
    };
  });

  // Held, not published. The rows are kept so confirming does not require
  // uploading and parsing the file a second time.
  const pendingId = putPending({ revisions });

  // The uploaded file has been parsed and diffed; nothing reads it again, and
  // the filesystem is ephemeral on the host anyway.
  fs.rm(req.file.path, { force: true }, () => {});

  res.json({
    pendingId,
    published: false,
    carriesHistory,
    revisionsToCreate: revisions.map((r) => ({ name: r.name, parts: r.rows.length })),
    file: { name: req.file.originalname, size: req.file.size, sheets: parsed.sheetNames },
    counts,
    matched,
    parts: diff.length,
    topUp,
    topDown,
    // The client sorts and filters the diff itself, so cap what crosses the wire.
    diff: diff
      .slice()
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
      .slice(0, 1000),
  });
});

/** Step 2 of 2: publish a held upload as the new current revision. */
router.post('/:pendingId/publish', async (req, res, next) => {
  const entry = takePending(req.params.pendingId);
  if (!entry) {
    return res.status(410).json({
      error: 'That preview has expired or was already published. Upload the file again.',
    });
  }
  try {
    const published = await publishRevisions(entry.revisions);
    res.json({
      published: true,
      revision: published.revision,
      created: published.created,
      pruned: published.pruned,
    });
  } catch (err) {
    next(err);
  }
});

/** Discards a held upload without publishing it. */
router.delete('/:pendingId', (req, res) => {
  dropPending(req.params.pendingId);
  res.json({ discarded: true });
});

export default router;
