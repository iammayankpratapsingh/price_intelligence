import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Card from '../components/Card.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useApi, useIntro } from '../lib/useApi.js';
import { sparkPoints } from '../lib/format.js';

const SERIES_COLORS = ['var(--text)', 'var(--red)', 'var(--green)'];
const SERIES_WIDTH = [2.2, 1.6, 1.6];

/** Indexes every series to its first revision = 100 and lays out the paths. */
function useIndexChart(series) {
  return useMemo(() => {
    if (!series?.length) return null;

    const indexed = series.map((s) => s.values.map((v) => (s.values[0] ? (v / s.values[0]) * 100 : 100)));
    const flat = indexed.flat();
    const mn = Math.floor(Math.min(...flat) / 2) * 2 - 2;
    const mx = Math.ceil(Math.max(...flat) / 2) * 2 + 2;

    const Y = (v) => 12 + (1 - (v - mn) / (mx - mn || 1)) * 200;
    const X = (i) => 36 + (i / 2) * 764;

    return {
      paths: series.map((s, k) => ({
        name: s.name,
        color: SERIES_COLORS[k % SERIES_COLORS.length],
        width: SERIES_WIDTH[k % SERIES_WIDTH.length],
        d: indexed[k].map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' '),
      })),
      grid: [0, 1, 2, 3, 4].map((k) => {
        const v = mn + ((mx - mn) * k) / 4;
        return { y: Y(v), ty: Y(v) + 4, label: v.toFixed(1) };
      }),
      X,
    };
  }, [series]);
}

export default function Analytics() {
  const { isMobile } = useOutletContext();
  const { data, loading, error, refetch } = useApi('/analytics');
  const navigate = useNavigate();
  const t = useIntro(900, [data]);
  const chart = useIndexChart(data?.series);

  if (loading) return <Loading label="Crunching pricing trends…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const maxAbs = Math.max(0.5, ...data.categories.map((c) => Math.abs(c.avgPct)));

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1240, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px,4vw,24px)', fontWeight: 600, letterSpacing: '-.01em' }}>
          Analytics
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
          Pricing trends across every revision on record: the lists from mrp solution.xlsx and the
          09 Aug 2026 list.
        </p>
      </div>

      <Card style={{ marginBottom: 16 }} padding={isMobile ? 18 : 24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Catalog price index</h2>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Average MRP of parts present in all revisions, indexed to old list = 100
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
            {chart?.paths.map((s) => (
              <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 2, background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {chart && (
          <svg
            viewBox="0 0 800 240"
            style={{ width: '100%', height: 'auto', marginTop: 16, overflow: 'visible', display: 'block' }}
            role="img"
            aria-label="Catalog price index across revisions"
          >
            {chart.grid.map((g) => (
              <g key={g.y}>
                <line x1="36" x2="800" y1={g.y} y2={g.y} stroke="var(--border)" />
                <text x="0" y={g.ty} fontSize="11" fill="var(--muted)">{g.label}</text>
              </g>
            ))}
            {chart.paths.map((s) => (
              <path
                key={s.name}
                d={s.d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {data.revisions.map((label, i) => (
              <text
                key={label}
                x={chart.X(i)}
                y="236"
                fontSize="11"
                fill="var(--muted)"
                textAnchor={i === 0 ? 'start' : i === data.revisions.length - 1 ? 'end' : 'middle'}
              >
                {label}
              </text>
            ))}
          </svg>
        )}
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <Card padding={isMobile ? 18 : 24}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Change by category</h2>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Revised list → 09 Aug 2026, average MRP movement of matched parts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.categories.map((c) => {
              const color = c.avgPct > 0 ? 'var(--red)' : c.avgPct < 0 ? 'var(--green)' : 'var(--muted)';
              const width = ((Math.abs(c.avgPct) / maxAbs) * 50 * t).toFixed(2);
              return (
                <div
                  key={c.hs}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '96px 1fr 52px' : '130px 1fr 56px',
                    gap: 12,
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <div style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </div>
                  <div style={{ position: 'relative', height: 8, background: 'var(--surface2)', borderRadius: 4 }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'var(--border)' }} />
                    <div
                      style={{
                        position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: color,
                        left: c.avgPct >= 0 ? '50%' : `${(50 - Number(width)).toFixed(2)}%`,
                        width: `${width}%`,
                        transition: 'width .6s ease, left .6s ease',
                      }}
                    />
                  </div>
                  <div className="num" style={{ textAlign: 'right', fontWeight: 600, color }}>
                    {c.avgPct > 0 ? '+' : ''}{c.avgPct.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding={isMobile ? 18 : 24}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Most volatile parts</h2>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            Largest swing between lowest and highest MRP across revisions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.volatile.map((r) => {
              const color = r.hist.at(-1) >= r.hist[0] ? 'var(--red)' : 'var(--green)';
              const pts = r.hist.length > 1 ? r.hist : [r.hist[0], r.hist[0]];
              return (
                <div
                  key={r.partNo}
                  onClick={() => navigate(`/part/${encodeURIComponent(r.partNo)}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/part/${encodeURIComponent(r.partNo)}`)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
                    padding: '9px 0', borderTop: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{r.partNo}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.desc}
                    </div>
                  </div>
                  <svg width="72" height="24" viewBox="0 0 72 24" style={{ overflow: 'visible' }} aria-hidden="true">
                    <polyline points={sparkPoints(pts, 72, 24)} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <div className="num" style={{ fontWeight: 600, fontSize: 13, minWidth: 56, textAlign: 'right' }}>
                    {r.swing.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
