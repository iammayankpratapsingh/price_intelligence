import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Fetches a path and re-fetches whenever it changes. Aborts stale requests. */
export function useApi(path, { skip = false } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (skip || !path) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ data: null, loading: false, error: err.message });
      });
    return () => ctrl.abort();
  }, [path, skip, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}

/**
 * Fetches a list endpoint one page at a time, appending each page to the rows
 * already held. Changing `path` (a new search term or filter) starts over.
 *
 * Only the page in flight is ever discarded — a stale response that arrives
 * after the query moved on is dropped rather than mixed into the new results.
 */
export function usePagedApi(path, limit = 300) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const ctrl = useRef(null);
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (offset) => {
      const id = ++reqId.current;
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const sep = path.includes('?') ? '&' : '?';
        const data = await api(`${path}${sep}limit=${limit}&offset=${offset}`, {
          signal: ctrl.current.signal,
        });
        if (id !== reqId.current) return;
        setRows((prev) => (offset === 0 ? data.rows : [...prev, ...data.rows]));
        setTotal(data.total ?? 0);
      } catch (err) {
        if (err.name === 'AbortError' || id !== reqId.current) return;
        setError(err.message);
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [path, limit],
  );

  useEffect(() => {
    setRows([]);
    setTotal(0);
    fetchPage(0);
    return () => ctrl.current?.abort();
  }, [fetchPage]);

  const hasMore = rows.length < total;
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) fetchPage(rows.length);
  }, [loading, loadingMore, hasMore, rows.length, fetchPage]);

  return { rows, total, loading, loadingMore, error, hasMore, loadMore, refetch: () => fetchPage(0) };
}

/** Debounces a value so typing in the search box does not fire a call per key. */
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Eases 0 → 1 once on mount, driving the count-up and bar-grow animations. */
export function useIntro(duration = 900, deps = []) {
  const [t, setT] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    setT(0);
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return t;
}
