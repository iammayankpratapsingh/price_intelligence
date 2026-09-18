/** Search, filter and sort over the in-memory catalog. */

const SORT_KEYS = new Set(['partNo', 'desc', 'cat', 'old', 'new', 'delta', 'pct']);

/** Missing values return null and are always sorted last, whichever way the
 *  column is sorted — a part with no previous price is not the "biggest"
 *  change, it is simply not comparable. */
function sortValue(part, key) {
  switch (key) {
    case 'pct':
      return part.pct;
    case 'delta':
      return part.delta == null ? null : Math.abs(part.delta);
    case 'old':
      return part.prev;
    case 'new':
      return part.cur;
    case 'cat':
      return part.cat;
    default:
      return part[key];
  }
}

export function queryParts(parts, opts = {}) {
  const {
    q = '',
    filter = 'all',
    sortKey = 'delta',
    sortDir = 'desc',
    limit = 300,
    offset = 0,
    excludeDropped = false,
  } = opts;

  const term = String(q).trim().toLowerCase();
  const key = SORT_KEYS.has(sortKey) ? sortKey : 'delta';
  const dir = sortDir === 'asc' ? 1 : -1;

  let rows = parts;

  if (filter && filter !== 'all') {
    rows = rows.filter((p) => p.status === filter);
  } else if (excludeDropped) {
    // The diff table hides parts that simply are not in the latest list.
    rows = rows.filter((p) => p.status !== 'dropped');
  }

  if (term) {
    rows = rows.filter(
      (p) =>
        p.partNo.toLowerCase().includes(term) ||
        p.desc.toLowerCase().includes(term) ||
        p.root.toLowerCase().includes(term),
    );
  }

  rows = rows.slice().sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });

  const total = rows.length;
  const start = Math.max(0, Number(offset) || 0);
  const size = Math.min(1000, Math.max(1, Number(limit) || 300));

  return { total, offset: start, limit: size, rows: rows.slice(start, start + size) };
}

/** Ranks a part against the revision before the one it is quoted in. */
export function partHistory(part, revisions, revisionSources) {
  const points = part.hist
    .map((value, index) => ({ value, index }))
    .filter((p) => p.value != null);

  const rows = points
    .slice()
    .reverse()
    .map((point, i, arr) => {
      const previous = arr[i + 1];
      const change = previous ? ((point.value - previous.value) / previous.value) * 100 : null;
      return {
        rev: revisions[point.index],
        source: revisionSources[point.index],
        price: point.value,
        change,
      };
    });

  return { points, rows };
}
