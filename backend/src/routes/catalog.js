import { Router } from 'express';
import { getCatalog, getRevisionLog, removeRevision } from '../lib/store.js';
import { queryParts, partHistory } from '../lib/query.js';

const router = Router();

/** Trims a part down to what list views actually render. */
const listShape = (p) => ({
  id: p.id,
  partNo: p.partNo,
  root: p.root,
  desc: p.desc,
  hs: p.hs,
  cat: p.cat,
  tax: p.tax,
  prev: p.prev,
  cur: p.cur,
  status: p.status,
  delta: p.delta,
  pct: p.pct,
});

/** Summary cards, change mix, biggest movers and the recent revision list. */
router.get('/dashboard', (req, res) => {
  const cat = getCatalog();
  const A = cat.aggregates;
  const c = A.counts;
  const matched = c.up + c.down + c.same;

  res.json({
    source: cat.source,
    latestRevision: cat.revisions[2],
    counts: c,
    matched,
    priced: A.priced,
    netDelta: A.netDelta,
    valuePrev: A.valuePrev,
    valueCur: A.valueCur,
    idxCat: A.idxCat,
    revStats: A.revStats,
    movers: cat.rankings.movers.map(listShape),
    history: getRevisionLog(),
  });
});

/** The comparison screen: headline counts plus the biggest % moves. */
router.get('/compare', (req, res) => {
  const cat = getCatalog();
  const c = cat.aggregates.counts;
  res.json({
    source: cat.source,
    counts: c,
    matched: c.up + c.down + c.same,
    priced: cat.aggregates.priced,
    sheetNames: cat.sheetNames,
    topUp: cat.rankings.topUp.map(listShape),
    topDown: cat.rankings.topDown.map(listShape),
  });
});

/** Search / diff table. Shared by the Catalog and Upload screens. */
router.get('/parts', (req, res) => {
  const cat = getCatalog();
  const { q, filter, sortKey, sortDir, limit, offset, excludeDropped } = req.query;
  const result = queryParts(cat.parts, {
    q,
    filter,
    sortKey,
    sortDir,
    limit,
    offset,
    excludeDropped: excludeDropped === '1' || excludeDropped === 'true',
  });
  res.json({ ...result, rows: result.rows.map(listShape) });
});

/** One part, with its full price history and per-revision changes. */
router.get('/parts/:partNo', (req, res) => {
  const cat = getCatalog();
  const part = cat.byPartNo.get(req.params.partNo);
  if (!part) return res.status(404).json({ error: `No part numbered ${req.params.partNo}.` });

  const { points, rows } = partHistory(part, cat.revisions, cat.revisionSources);
  res.json({
    ...part,
    revisions: cat.revisions,
    revisionSources: cat.revisionSources,
    points,
    rows,
  });
});

/** Price index, per-category movement and the most volatile parts. */
router.get('/analytics', (req, res) => {
  const cat = getCatalog();
  const A = cat.aggregates;

  const indexGroups = A.hsGroups.filter((g) => g.idx.every((x) => x[1] > 0)).slice(0, 2);
  const series = [
    { name: 'Whole catalog', key: 'catalog', values: A.idxCat },
    ...indexGroups.map((g) => ({
      name: g.name,
      key: g.hs,
      values: g.idx.map((x) => x[0] / x[1]),
    })),
  ];

  // At least 20 priced parts before a category average is worth showing.
  const categories = A.hsGroups
    .filter((g) => g.k >= 20)
    .slice(0, 7)
    .map((g) => ({ name: g.name, hs: g.hs, avgPct: g.sum / g.k, n: g.n }));

  res.json({
    revisions: cat.revisions,
    series,
    categories,
    all3: A.all3,
    volatile: cat.rankings.volatile.map(({ part, swing, hist }) => ({
      ...listShape(part),
      swing,
      hist,
    })),
  });
});

router.get('/history', (req, res) => {
  res.json({ revisions: getRevisionLog() });
});

/**
 * Undoes an uploaded revision. The store refuses anything but the most recent
 * upload, so this cannot rewrite what earlier prices were compared against.
 */
router.delete('/history/:seq', async (req, res, next) => {
  const seq = Number(req.params.seq);
  if (!Number.isInteger(seq)) return res.status(400).json({ error: 'Invalid revision.' });
  try {
    const removed = await removeRevision(seq);
    res.json({ removed, revisions: getRevisionLog() });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default router;
