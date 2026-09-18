import { useNavigate } from 'react-router-dom';
import Badge from './Badge.jsx';
import { Empty } from './States.jsx';
import { deltaText, fmt, pctText } from '../lib/format.js';

const TH = {
  position: 'sticky',
  top: 0,
  background: 'var(--surface)',
  zIndex: 1,
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

const TD = { padding: '10px 12px', borderBottom: '1px solid var(--border)' };

/** Stacked card list — the table layout below 900px. */
function MobileRows({ rows, onOpen }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div
          key={r.partNo}
          onClick={() => onOpen(r)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onOpen(r)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            background: i % 2 ? 'var(--zebra)' : 'transparent',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{r.partNo}</span>
            <Badge part={r}>{pctText(r)}</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{r.desc}</div>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 10, fontSize: 12, color: 'var(--muted)',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cat}</span>
            <span className="num" style={{ whiteSpace: 'nowrap' }}>
              {r.prev != null && <span>{fmt(r.prev)} → </span>}
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmt(r.cur)}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The catalog / diff table. `variant="diff"` shows the before-and-after money
 * columns and sortable headers; `variant="catalog"` shows HSN and current MRP.
 */
export default function PartsTable({
  rows,
  isMobile,
  variant = 'catalog',
  sortKey,
  sortDir,
  onSort,
  maxHeight = 620,
  emptyTitle,
  emptyHint,
  footer,
}) {
  const navigate = useNavigate();
  const open = (r) => navigate(`/part/${encodeURIComponent(r.partNo)}`);

  if (!rows.length) {
    return <Empty title={emptyTitle || 'No parts to show'} hint={emptyHint} />;
  }

  if (isMobile) {
    return (
      <div style={{ maxHeight, overflow: 'auto' }}>
        <MobileRows rows={rows} onOpen={open} />
        {footer}
      </div>
    );
  }

  const cols =
    variant === 'diff'
      ? [
          ['partNo', 'Part no.', 'left'],
          ['desc', 'Description', 'left'],
          ['cat', 'Category', 'left'],
          ['old', 'Previous price', 'right'],
          ['new', 'Current price', 'right'],
          ['delta', 'Difference', 'right'],
          ['pct', 'Change', 'right'],
        ]
      : [
          ['partNo', 'Part no.', 'left'],
          ['desc', 'Description', 'left'],
          ['cat', 'Category', 'left'],
          ['hs', 'HSN', 'left'],
          ['new', 'MRP', 'right'],
          ['pct', 'Last change', 'right'],
        ];

  return (
    <div style={{ maxHeight, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(([key, label, align]) => {
              const sortable = Boolean(onSort) && key !== 'hs';
              const active = sortKey === key;
              return (
                <th
                  key={key}
                  onClick={sortable ? () => onSort(key) : undefined}
                  style={{
                    ...TH,
                    textAlign: align,
                    color: active ? 'var(--text)' : 'var(--muted)',
                    cursor: sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.partNo}
              onClick={() => open(r)}
              style={{ background: i % 2 ? 'var(--zebra)' : 'transparent', cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 ? 'var(--zebra)' : 'transparent'; }}
            >
              <td className="mono" style={{ ...TD, fontWeight: 500, whiteSpace: 'nowrap' }}>{r.partNo}</td>
              <td style={{ ...TD, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.desc}
              </td>
              <td style={{ ...TD, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.cat}</td>

              {variant === 'diff' ? (
                <>
                  <td className="num" style={{ ...TD, textAlign: 'right', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {fmt(r.prev)}
                  </td>
                  <td className="num" style={{ ...TD, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmt(r.cur)}
                  </td>
                  <td
                    className="num"
                    style={{
                      ...TD, textAlign: 'right', whiteSpace: 'nowrap',
                      color: r.delta > 0 ? 'var(--red)' : r.delta < 0 ? 'var(--green)' : 'var(--muted)',
                    }}
                  >
                    {deltaText(r)}
                  </td>
                </>
              ) : (
                <>
                  <td className="num" style={{ ...TD, color: 'var(--muted)' }}>{r.hs || '—'}</td>
                  <td className="num" style={{ ...TD, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmt(r.cur ?? r.prev)}
                  </td>
                </>
              )}

              <td style={{ ...TD, textAlign: 'right' }}>
                <Badge part={r}>{pctText(r)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
  );
}
