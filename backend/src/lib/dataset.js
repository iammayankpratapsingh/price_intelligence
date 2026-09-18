import { hsName } from './hs.js';

/**
 * Turns merged workbook rows into the catalog the API serves: per-part status
 * against the previous revision, plus every aggregate the dashboard and
 * analytics screens need.
 */

export const REVISIONS = ['Old list', 'Revised list', '09 Aug 2026'];
export const REVISION_SOURCES = [
  'mrp solution.xlsx · sheet "old" · OLD MRP',
  'mrp solution.xlsx · sheet "old" · NEW MRP',
  'mrp solution.xlsx · sheet "new mrp"',
];

/**
 * Status is always "latest revision vs. the one before it":
 *   up/down/same  priced in both
 *   new           priced only in the latest list
 *   dropped       priced before, absent from the latest list
 */
export function decorate(row, id) {
  // The latest revision is the current price; the previous is the most recent
  // revision before it that actually quoted the part. Works for any number of
  // revisions, so adding a price list does not change these semantics.
  const cur = row.hist.at(-1) ?? null;
  let prev = null;
  for (let i = row.hist.length - 2; i >= 0; i--) {
    if (row.hist[i] != null) { prev = row.hist[i]; break; }
  }
  const status =
    cur == null ? 'dropped' : prev == null ? 'new' : cur > prev ? 'up' : cur < prev ? 'down' : 'same';
  const delta = cur != null && prev != null ? cur - prev : null;
  return {
    id,
    partNo: row.partNo,
    root: row.root,
    desc: row.desc,
    hs: row.hs,
    cat: hsName(row.hs),
    tax: row.tax,
    hist: row.hist,
    prev,
    cur,
    status,
    delta,
    pct: cur != null && prev != null && prev ? ((cur - prev) / prev) * 100 : null,
  };
}

function buildAggregates(parts, n) {
  const counts = { up: 0, down: 0, same: 0, new: 0, dropped: 0 };
  let netDelta = 0;
  let valuePrev = 0;
  let valueCur = 0;
  const priced = new Array(n).fill(0);
  const hsGroups = new Map();

  for (const p of parts) {
    counts[p.status]++;
    if (p.delta != null) {
      netDelta += p.delta;
      valuePrev += p.prev;
      valueCur += p.cur;
    }
    p.hist.forEach((v, i) => {
      if (v != null) priced[i]++;
    });

    let g = hsGroups.get(p.hs);
    if (!g) {
      g = { hs: p.hs, name: hsName(p.hs), n: 0, sum: 0, k: 0, idx: Array.from({ length: n }, () => [0, 0]) };
      hsGroups.set(p.hs, g);
    }
    g.n++;
    if (p.pct != null) {
      g.sum += p.pct;
      g.k++;
    }
    // Only parts priced in all three revisions feed the index, so the series
    // moves with prices rather than with catalog coverage.
    if (p.hist.every((v) => v != null)) {
      p.hist.forEach((v, i) => {
        g.idx[i][0] += v;
        g.idx[i][1]++;
      });
    }
  }

  // Revision-to-revision movement, used by the history screen.
  const revStats = Array.from({ length: n }, (_, i) => {
    const s = { up: 0, down: 0, nw: 0 };
    for (const p of parts) {
      const cur = p.hist[i];
      const prev = i ? p.hist[i - 1] : null;
      if (cur == null) continue;
      if (i === 0 || prev == null) s.nw++;
      else if (cur > prev) s.up++;
      else if (cur < prev) s.down++;
    }
    return s;
  });

  // Only parts priced in every revision feed the index, so it moves with
  // prices rather than with catalog coverage.
  const all3 = parts.filter((p) => p.hist.every((v) => v != null));
  const idxCat = Array.from({ length: n }, (_, i) =>
    all3.length ? all3.reduce((a, p) => a + p.hist[i], 0) / all3.length : 0,
  );

  return {
    counts,
    netDelta,
    valuePrev,
    valueCur,
    priced,
    revStats,
    idxCat,
    all3: all3.length,
    hsGroups: [...hsGroups.values()].sort((a, b) => b.n - a.n),
  };
}

function buildRankings(parts) {
  const movers = parts
    .filter((p) => p.delta != null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const topUp = parts.filter((p) => p.pct != null && p.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5);
  const topDown = parts.filter((p) => p.pct != null && p.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5);

  const volatile = parts
    .filter((p) => p.hist.filter((v) => v != null).length >= 2)
    .map((p) => {
      const h = p.hist.filter((v) => v != null);
      const mn = Math.min(...h);
      return { part: p, swing: mn ? ((Math.max(...h) - mn) / mn) * 100 : 0, hist: h };
    })
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 6);

  return { movers, topUp, topDown, volatile };
}

/** Builds the in-memory catalog: parts, lookup index, aggregates, rankings. */
export function buildCatalog({ rows, sheetNames, source, uploadedAt }) {
  const parts = rows.map(decorate);
  const byPartNo = new Map(parts.map((p) => [p.partNo, p]));
  const n = rows[0]?.hist.length ?? REVISIONS.length;
  return {
    parts,
    byPartNo,
    sheetNames,
    source: source || 'mrp solution.xlsx',
    uploadedAt: uploadedAt || new Date().toISOString(),
    aggregates: buildAggregates(parts, n),
    rankings: buildRankings(parts),
    revisions: REVISIONS,
    revisionSources: REVISION_SOURCES,
  };
}
