import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Card, { PageHeader } from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import FilterChips from '../components/FilterChips.jsx';
import PartsTable from '../components/PartsTable.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useApi, usePagedApi } from '../lib/useApi.js';
import { fmtInt } from '../lib/format.js';

const PAGE = 300;

/** A plain count, kept compact: one short label and one number. */
function Tile({ label, value, color, mark }) {
  return (
    <Card padding={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="num" style={{ color, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{mark}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
        <span className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color }}>
          {fmtInt(value)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>parts</span>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { isMobile } = useOutletContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('delta');
  const [sortDir, setSortDir] = useState('desc');

  const { data, loading: loadingCounts, error: countsError, refetch } = useApi('/dashboard');

  const { rows, total, loading, loadingMore, error, hasMore, loadMore } = usePagedApi(
    `/parts?filter=${filter}&sortKey=${sortKey}&sortDir=${sortDir}&excludeDropped=1`,
    PAGE,
  );

  // Loads the next page as the end of the list comes into view.
  const sentinel = useRef(null);
  const onSentinel = useCallback((node) => { sentinel.current = node; }, []);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return undefined;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loadMore, rows.length]);

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (loadingCounts) return <Loading label="Loading prices…" />;
  if (countsError) return <ErrorState message={countsError} onRetry={refetch} />;
  if (!data) return null;

  const c = data.counts;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1240, margin: '0 auto' }} className="fade-up">
      <PageHeader
        title="Price list"
        subtitle="Every part with its old price, its new price, and what changed."
        action={
          <button
            type="button"
            onClick={() => navigate('/upload')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px',
              borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,.12)', transition: 'filter .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            <Icon name="upload" size={16} strokeWidth={2.2} />
            Upload new price list
          </button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Tile label="Price went up" value={c.up} color="var(--red)" mark="▲" />
        <Tile label="Price went down" value={c.down} color="var(--green)" mark="▼" />
        <Tile label="No change" value={c.same} color="var(--muted)" mark="—" />
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12,
          overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0,
        }}
      >
        <FilterChips value={filter} onChange={setFilter} />
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {loading ? 'Loading…' : hasMore ? `showing ${fmtInt(rows.length)} of ${fmtInt(total)}` : `${fmtInt(total)} parts`}
        </span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setFilter((f) => f)} />
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <PartsTable
            rows={rows}
            isMobile={isMobile}
            variant="diff"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            maxHeight={isMobile ? '65dvh' : 640}
            emptyTitle="No parts to show"
            emptyHint="Try another filter."
            footer={
              hasMore ? (
                <div
                  ref={onSentinel}
                  style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}
                >
                  {loadingMore ? 'Loading more…' : `${fmtInt(total - rows.length)} more`}
                </div>
              ) : null
            }
          />
        </Card>
      )}
    </div>
  );
}
