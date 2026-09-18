import fs from 'node:fs';
import XLSX from 'xlsx';

/**
 * Reading the MRP workbook.
 *
 * `mrp solution.xlsx` carries two sheets:
 *   "old"      PART_NUM | NEW MRP(lookup) | ROOT_PART_NUM | PART_DESC | OLD MRP | NEW MRP | TAX_DESC | HS_CODE | ...
 *   "new mrp"  PART_NUM | ROOT_PART_NUM | PART_DESC | MRP | TAX_DESC | HS_CODE
 *
 * The "old" sheet holds two historical revisions (OLD MRP, then the revised
 * NEW MRP). The "new mrp" sheet is the current 09 Aug 2026 list. Together they
 * give every part up to three revisions of price history.
 */

const HEADER_ALIASES = {
  partNo: ['PART_NUM', 'PART NUM', 'PART NO', 'PARTNO', 'PART_NO', 'PART NUMBER'],
  root: ['ROOT_PART_NUM', 'ROOT PART NUM', 'ROOT_PART_NO', 'ROOT PART NUMBER'],
  desc: ['PART_DESC', 'PART DESC', 'DESCRIPTION', 'PART DESCRIPTION'],
  tax: ['TAX_DESC', 'TAX DESC', 'TAX', 'GST'],
  hs: ['HS_CODE', 'HS CODE', 'HSN', 'HSN_CODE', 'HSN CODE'],
  oldMrp: ['OLD MRP', 'OLD_MRP', 'OLD PRICE', 'PREVIOUS MRP'],
  newMrp: ['NEW MRP', 'NEW_MRP', 'REVISED MRP', 'NEW PRICE'],
  mrp: ['MRP', 'PRICE', 'LATEST MRP', 'CURRENT MRP'],
};

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

/** `#N/A`, blanks and non-numeric junk all become null rather than 0. */
export function toNumber(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[₹,\s]/g, '');
  if (!s || /^#/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "GST @ 18%" -> 18 */
export function taxRate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const m = String(v).match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return Number(m[1]);
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function cleanCode(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(Math.round(v));
  return String(v).trim();
}

/**
 * Maps a sheet's header row to column letters. A header may legitimately appear
 * twice (the "old" sheet has two NEW MRP columns) so later duplicates are only
 * recorded under `duplicates`.
 */
function mapHeaders(sheet, range) {
  const found = {};
  const duplicates = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    if (!cell) continue;
    const label = norm(cell.w ?? cell.v);
    if (!label) continue;
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!aliases.includes(label)) continue;
      if (found[key] === undefined) found[key] = c;
      else (duplicates[key] ||= []).push(c);
    }
  }
  return { found, duplicates };
}

function readCells(sheet, range, colIndex) {
  const out = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row = {};
    let empty = true;
    for (const [key, c] of Object.entries(colIndex)) {
      if (c == null) continue;
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const v = cell ? (cell.t === 'n' ? cell.v : (cell.w ?? cell.v)) : null;
      row[key] = v;
      if (v !== null && v !== undefined && v !== '') empty = false;
    }
    if (!empty) out.push(row);
  }
  return out;
}

/** Reads one sheet into `{ partNo, root, desc, tax, hs, prices: {...} }` rows. */
function parseSheet(sheet) {
  if (!sheet || !sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const { found, duplicates } = mapHeaders(sheet, range);
  if (found.partNo == null) return [];

  // On the "old" sheet the FIRST "NEW MRP" column is an Excel lookup that often
  // resolves to #N/A; the real revised price sits in the second one.
  let revisedCol = found.newMrp;
  if (duplicates.newMrp?.length) revisedCol = duplicates.newMrp[duplicates.newMrp.length - 1];

  const colIndex = {
    partNo: found.partNo,
    root: found.root,
    desc: found.desc,
    tax: found.tax,
    hs: found.hs,
    oldMrp: found.oldMrp,
    newMrp: revisedCol,
    mrp: found.mrp,
  };

  return readCells(sheet, range, colIndex)
    .map((r) => {
      const partNo = cleanCode(r.partNo);
      if (!partNo) return null;
      return {
        partNo,
        root: cleanCode(r.root) || partNo,
        desc: String(r.desc ?? '').trim(),
        tax: taxRate(r.tax),
        hs: cleanCode(r.hs),
        oldMrp: toNumber(r.oldMrp),
        newMrp: toNumber(r.newMrp),
        mrp: toNumber(r.mrp),
      };
    })
    .filter(Boolean);
}

/** Picks the sheet whose name best matches any of `names`, else by position. */
function pickSheet(wb, names, fallbackIndex) {
  for (const want of names) {
    const hit = wb.SheetNames.find((n) => norm(n) === norm(want));
    if (hit) return wb.Sheets[hit];
  }
  for (const want of names) {
    const hit = wb.SheetNames.find((n) => norm(n).includes(norm(want)));
    if (hit) return wb.Sheets[hit];
  }
  const name = wb.SheetNames[fallbackIndex];
  return name ? wb.Sheets[name] : null;
}

/**
 * Reads the workbook and merges both sheets into one row per part number with
 * a three-point price history: [old list, revised list, latest list].
 */
export function readWorkbook(input) {
  const buf = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false, cellText: true, dense: false });

  const oldSheet = pickSheet(wb, ['old'], 0);
  const newSheet = pickSheet(wb, ['new mrp', 'new', 'latest'], 1);

  const oldRows = parseSheet(oldSheet);
  const newRows = wb.SheetNames.length > 1 ? parseSheet(newSheet) : [];

  const merged = new Map();
  const take = (partNo) => {
    let m = merged.get(partNo);
    if (!m) {
      m = { partNo, root: '', desc: '', tax: null, hs: '', hist: [null, null, null] };
      merged.set(partNo, m);
    }
    return m;
  };

  for (const r of oldRows) {
    const m = take(r.partNo);
    m.root ||= r.root;
    m.desc ||= r.desc;
    m.tax ??= r.tax;
    m.hs ||= r.hs;
    m.hist[0] = r.oldMrp ?? m.hist[0];
    m.hist[1] = r.newMrp ?? m.hist[1];
  }

  for (const r of newRows) {
    const m = take(r.partNo);
    m.root ||= r.root;
    // The newer sheet carries the authoritative description / tax / HS code.
    if (r.desc) m.desc = r.desc;
    if (r.tax != null) m.tax = r.tax;
    if (r.hs) m.hs = r.hs;
    m.hist[2] = r.mrp ?? m.hist[2];
  }

  // A single-sheet upload is treated as one fresh revision, not as history.
  const singleSheet = newRows.length === 0 && oldRows.length > 0 && oldRows.every((r) => r.mrp != null && r.oldMrp == null);
  if (singleSheet) {
    for (const r of oldRows) take(r.partNo).hist = [null, null, r.mrp];
  }

  return {
    sheetNames: wb.SheetNames,
    rows: [...merged.values()].sort((a, b) => (a.partNo < b.partNo ? -1 : a.partNo > b.partNo ? 1 : 0)),
  };
}
