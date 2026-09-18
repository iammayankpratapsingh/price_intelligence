import { useMemo } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useApi } from '../lib/useApi.js';
import { fmt, meta, pctText } from '../lib/format.js';

/** Builds the step-chart geometry for one part's price history. */
function useChart(part) {
  return useMemo(() => {
    if (!part?.points?.length) return null;

    const values = part.points.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo || hi || 1) * 0.25;
    const mn = Math.max(0, lo - pad);
    const mx = hi + pad;

    const span = (part.revisions?.length || 3) - 1 || 1;
    const X = (i) => 60 + (i / span) * 560;
    const Y = (v) => 12 + (1 - (v - mn) / (mx - mn || 1)) * 160;

    let step = '';
    let area = '';
    part.points.forEach((p, k) => {
      const x = X(p.index);
      const y = Y(p.value);
      if (k === 0) {
        step = `M${x} ${y}`;
        area = `M${x} 172 L${x} ${y}`;
      } else {
        step += ` H${x} V${y}`;
        area += ` H${x} V${y}`;
      }
    });
    if (part.points.length) area += ` L${X(part.points.at(-1).index)} 172 Z`;
    // A single data point would render as an invisible zero-length path.
    if (part.points.length === 1) step += ' h20';

    const gridY = [0, 1, 2, 3].map((k) => {
      const v = mn + (mx - mn) * (1 - k / 3);
      const y = Y(v);
      return { y, ty: y + 4, label: fmt(v) };
    });

    return {
      step,
      area,
      gridY,
      dots: part.points.map((p) => ({ x: X(p.index), y: Y(p.value), label: part.revisions[p.index] })),
    };
  }, [part]);
}

export default function PartDetail() {
  const { partNo } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useOutletContext();
  const { data: part, loading, error, refetch } = useApi(`/parts/${encodeURIComponent(partNo)}`);
  const chart = useChart(part);

  if (loading) return <Loading label={`Loading ${partNo}…`} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!part) return null;

  const m = meta(part.status);
  const lastChanged = part.rows.find((r) => r.change != null && r.change !== 0);

  const changeLine =
    part.status === 'new'
      ? 'Listed for the first time in the 09 Aug 2026 list'
      : part.status === 'dropped'
        ? 'Not present in the 09 Aug 2026 list'
        : `${m.sym} ${pctText(part)} vs revised list (${fmt(part.prev)})`;

  const metaCards = [
    { k: 'Root part no.', v: part.root || '—', mono: true },
    { k: 'HSN code', v: part.hs || '—' },
    { k: 'GST rate', v: part.tax != null ? `${part.tax}%` : '—' },
    { k: 'Category', v: part.cat },
    { k: 'Last changed', v: lastChanged ? lastChanged.rev : 'No change on record' },
  ];

  const th = {
    textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600,
    letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)',
    borderBottom: '1px solid var(--border)',
  };
  const td = { padding: '9px 12px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1000, margin: '0 auto' }} className="fade-up">
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)',
          marginBottom: 20, border: 'none', background: 'none', padding: 0, cursor: 'pointer',
        }}
      >
        <Icon name="back" size={14} strokeWidth={2} />
        Back
      </button>

      <div
        style={{
          display: 'flex', justifyContent: 'space-between', gap: 24,
          flexWrap: 'wrap', alignItems: 'flex-start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              className="mono"
              style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 500, letterSpacing: '-.01em', wordBreak: 'break-all' }}
            >
              {part.partNo}
            </h1>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                borderRadius: 999, fontSize: 12, fontWeight: 600, color: m.color, background: m.bg,
              }}
            >
              {m.sym} {m.label}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 16 }}>{part.desc}</p>
          <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            {part.cat} · {part.tax != null ? `GST ${part.tax}%` : 'GST rate not listed'}
          </p>
        </div>

        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <div
            style={{
              fontSize: 12, fontWeight: 500, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '.02em',
            }}
          >
            {part.status === 'dropped' ? 'Last known MRP' : 'Current MRP'}
          </div>
          <div
            className="num"
            style={{ fontSize: isMobile ? 32 : 40, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.1 }}
          >
            {fmt(part.cur ?? part.prev)}
          </div>
          <div className="num" style={{ fontSize: 13, color: m.color, fontWeight: 500 }}>{changeLine}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12, margin: '28px 0 24px',
        }}
      >
        {metaCards.map((c) => (
          <div
            key={c.k}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px', minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 11, fontWeight: 500, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.04em',
              }}
            >
              {c.k}
            </div>
            <div
              className={c.mono ? 'mono num' : 'num'}
              style={{ fontWeight: 500, marginTop: 4, wordBreak: 'break-word' }}
            >
              {c.v}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Price history</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            MRP across {part.points.length} revision{part.points.length === 1 ? '' : 's'}
          </span>
        </div>

        {chart && (
          <svg
            viewBox="0 0 640 200"
            style={{ width: '100%', height: 'auto', marginTop: 16, overflow: 'visible', display: 'block' }}
            role="img"
            aria-label={`Price history for ${part.partNo}`}
          >
            {chart.gridY.map((g) => (
              <g key={g.y}>
                <line x1="60" x2="640" y1={g.y} y2={g.y} stroke="var(--border)" strokeWidth="1" />
                <text x="0" y={g.ty} fontSize="11" fill="var(--muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {g.label}
                </text>
              </g>
            ))}
            <path d={chart.area} fill={m.color} opacity="0.08" />
            <path d={chart.step} fill="none" stroke={m.color} strokeWidth="2" strokeLinejoin="round" />
            {chart.dots.map((d) => (
              <g key={d.label}>
                <circle cx={d.x} cy={d.y} r="4" fill="var(--surface)" stroke={m.color} strokeWidth="2" />
                <text x={d.x} y="196" fontSize="11" fill="var(--muted)" textAnchor="middle">{d.label}</text>
              </g>
            ))}
          </svg>
        )}

        <div style={{ overflowX: 'auto', marginTop: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
            <thead>
              <tr>
                <th style={th}>Revision</th>
                <th style={th}>Source</th>
                <th style={{ ...th, textAlign: 'right' }}>MRP</th>
                <th style={{ ...th, textAlign: 'right' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {part.rows.map((r, i) => {
                const color =
                  r.change == null ? 'var(--blue)'
                    : r.change > 0 ? 'var(--red)'
                      : r.change < 0 ? 'var(--green)' : 'var(--muted)';
                const text =
                  r.change == null ? '● first listed'
                    : r.change === 0 ? '— 0.0%'
                      : `${r.change > 0 ? '▲ +' : '▼ '}${r.change.toFixed(1)}%`;
                return (
                  <tr key={r.rev} style={{ background: i % 2 ? 'var(--zebra)' : 'transparent' }}>
                    <td style={{ ...td, fontWeight: 500, whiteSpace: 'nowrap' }}>{r.rev}</td>
                    <td style={{ ...td, color: 'var(--muted)' }}>{r.source}</td>
                    <td className="num" style={{ ...td, textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {fmt(r.price)}
                    </td>
                    <td className="num" style={{ ...td, textAlign: 'right', color, whiteSpace: 'nowrap' }}>{text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
