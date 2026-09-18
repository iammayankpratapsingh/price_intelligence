/** Shared number, currency and status formatting. */

export const fmtInt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-IN'));

export const fmt = (n) =>
  n == null
    ? '—'
    : '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Large rupee totals collapse to lakh / crore, the way the sheets read. */
export function fmtLarge(n) {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '+';
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${fmtInt(a)}`;
}

export const STATUS_META = {
  up: { sym: '▲', label: 'Increased', color: 'var(--red)', bg: 'var(--red-bg)' },
  down: { sym: '▼', label: 'Decreased', color: 'var(--green)', bg: 'var(--green-bg)' },
  same: { sym: '—', label: 'Unchanged', color: 'var(--muted)', bg: 'var(--surface2)' },
  new: { sym: '●', label: 'New part', color: 'var(--blue)', bg: 'var(--blue-bg)' },
  dropped: { sym: '○', label: 'Not in latest list', color: 'var(--faint)', bg: 'var(--surface2)' },
};

export const meta = (status) => STATUS_META[status] || STATUS_META.same;

export function pctText(part) {
  if (part.status === 'new') return 'new';
  if (part.status === 'dropped') return 'dropped';
  if (part.pct == null) return '—';
  return `${part.pct > 0 ? '+' : ''}${part.pct.toFixed(1)}%`;
}

export function deltaText(part) {
  if (part.delta == null) return '—';
  const sign = part.delta > 0 ? '+' : part.delta < 0 ? '−' : '';
  return sign + fmt(Math.abs(part.delta));
}

/** Polyline points for the small inline sparklines. */
export function sparkPoints(values, w, h) {
  if (!values?.length) return '';
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const range = mx - mn || 1;
  const span = values.length > 1 ? values.length - 1 : 1;
  return values
    .map((v, i) => `${(i / span) * w},${h - 2 - ((v - mn) / range) * (h - 4)}`)
    .join(' ');
}
