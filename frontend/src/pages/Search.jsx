import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import FilterChips from '../components/FilterChips.jsx';
import PartsTable from '../components/PartsTable.jsx';
import { ErrorState } from '../components/States.jsx';
import { usePagedApi, useDebounced } from '../lib/useApi.js';
import { fmtInt } from '../lib/format.js';

const PAGE = 300;

export default function Search() {
  const { isMobile } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [filter, setFilter] = useState('all');

  // The header search box writes ?q=, so mirror it back into the field.
  useEffect(() => {
    const q = params.get('q') || '';
    setQuery((current) => (current === q ? current : q));
  }, [params]);

  const debounced = useDebounced(query, 250);
  const { rows, total, loading, loadingMore, error, hasMore, loadMore, refetch } = usePagedApi(
    `/parts?q=${encodeURIComponent(debounced)}&filter=${filter}&sortKey=partNo&sortDir=asc`,
    PAGE,
  );

  // The sentinel sits at the end of the scrolling list; when it comes into
  // view the next page is fetched, so scrolling just keeps going.
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

  const onType = (value) => {
    setQuery(value);
    setParams(value ? { q: value } : {}, { replace: true });
  };

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1240, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px,4vw,24px)', fontWeight: 600, letterSpacing: '-.01em' }}>
          Catalog
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
          Search by part number, partial number, or description. Results update as you type.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Icon
          name="search"
          size={18}
          strokeWidth={2}
          style={{ position: 'absolute', left: 16, top: 15, color: 'var(--faint)', pointerEvents: 'none' }}
        />
        <input
          value={query}
          onChange={(e) => onType(e.target.value)}
          placeholder="e.g. 01104 or brake pad"
          aria-label="Search the catalog"
          style={{
            width: '100%', height: 48, padding: '0 16px 0 44px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            fontSize: 16, outline: 'none', boxShadow: 'var(--shadow)',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--red)';
            e.target.style.boxShadow = '0 0 0 3px var(--red-bg)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'var(--shadow)';
          }}
        />
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16,
          overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0,
        }}
      >
        <FilterChips value={filter} onChange={setFilter} />
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {loading
            ? 'Searching…'
            : hasMore
              ? `showing ${fmtInt(rows.length)} of ${fmtInt(total)} parts`
              : `${fmtInt(total)} parts`}
        </span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <PartsTable
            rows={rows}
            isMobile={isMobile}
            variant="catalog"
            maxHeight={isMobile ? '65dvh' : 620}
            emptyTitle={debounced ? `No parts match “${debounced}”` : 'No parts match this filter'}
            emptyHint="Try a shorter prefix of the part number, or a word from the description."
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
