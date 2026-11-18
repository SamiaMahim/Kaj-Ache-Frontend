import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads a paginated job list (fetchPage(page) -> { items, total }) and optionally keeps it fresh.
 * Every refresh reloads all pages loaded so far, so "Load more" results don't disappear on the next poll.
 * Polling stops on a 403 (e.g. a technician who is not approved yet). `reloadKey` forces a reload.
 */
export default function usePagedList(fetchPage, { refreshMs = 0, reloadKey = 0 } = {}) {
  const [state, setState] = useState({ items: [], total: 0, loaded: false, error: null });
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  useEffect(() => {
    let active = true;
    let intervalId = null;
    const load = async () => {
      try {
        const results = await Promise.all(Array.from({ length: pages }, (_, index) => fetchRef.current(index + 1)));
        if (!active) return;
        setState({ items: results.flatMap((result) => result.items || []), total: results[0]?.total ?? 0, loaded: true, error: null });
      } catch (error) {
        if (!active) return;
        setState((current) => ({ ...current, loaded: true, error }));
        if (error.status === 403 && intervalId) window.clearInterval(intervalId);
      } finally {
        if (active) setLoadingMore(false);
      }
    };
    load();
    if (refreshMs) intervalId = window.setInterval(load, refreshMs);
    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [pages, refreshMs, reloadKey]);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    setPages((count) => count + 1);
  }, []);

  return { ...state, hasMore: state.items.length < state.total, loadMore, loadingMore };
}
