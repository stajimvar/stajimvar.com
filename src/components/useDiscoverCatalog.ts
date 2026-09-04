import { useEffect, useRef, useState } from 'react';
import { fetchDiscoverCatalog } from '../lib/kesfet';
import { mergeCatalogEvents, readCatalogReturn, saveCatalogReturn } from './kesfet-catalog-state.mjs';

type Filters = {
  city: string;
  period: 'all' | 'today' | 'week' | 'month';
  category: string;
  free: boolean;
  discount: boolean;
  sort: 'newest' | 'upcoming';
};
type Catalog = Awaited<ReturnType<typeof fetchDiscoverCatalog>>;
type ReturnState = {
  filters: Filters;
  query: string;
  data: Catalog;
  filtersOpen: boolean;
  scrollY: number;
};
const DEFAULT_FILTERS: Filters = { city: '', category: '', period: 'all', free: false, discount: false, sort: 'newest' };

export function useDiscoverCatalog(searchQuery: string, onSearchChange?: (query: string) => void) {
  const [restored] = useState<ReturnState | null>(() => readCatalogReturn(window.history.state?.__discoverCatalogKey));
  const [filters, setFilters] = useState<Filters>(restored?.filters ?? DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(restored?.filtersOpen ?? false);
  const [query, setQuery] = useState(restored?.query ?? searchQuery.trim());
  const [data, setData] = useState<Catalog | null>(restored?.data ?? null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>(restored ? 'ready' : 'loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [revision, setRevision] = useState(0);
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const moreBusy = useRef(false);
  const restorePending = useRef(restored);
  const restoreKey = useRef(JSON.stringify({ ...filters, query }));
  const key = JSON.stringify({ ...filters, query });
  const searchPending = searchQuery.trim() !== query;

  useEffect(() => {
    if (restored && restored.query !== searchQuery) onSearchChange?.(restored.query);
    // Parent search is only restored on the initial detail return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!restored) return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: restored.scrollY, behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [restored]);

  useEffect(() => {
    if (restorePending.current && key === restoreKey.current && revision === 0) return;
    restorePending.current = null;
    const request = ++version.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    moreBusy.current = false;
    setLoadingMore(false);
    setMoreError(false);
    setPhase('loading');
    fetchDiscoverCatalog({ ...filters, query, signal: abort.signal })
      .then((result) => {
        if (request !== version.current || abort.signal.aborted) return;
        setData({ ...result, events: mergeCatalogEvents([], result.events) });
        setPhase('ready');
      })
      .catch(() => {
        if (request === version.current && !abort.signal.aborted) setPhase('error');
      });
    return () => abort.abort();
    // key includes every server-side filter and the debounced query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);

  useEffect(() => () => { controller.current?.abort(); }, []);

  const loadMore = async () => {
    if (searchPending || moreBusy.current || phase !== 'ready' || !data?.hasMore || !data.nextCursor) return;
    moreBusy.current = true;
    setLoadingMore(true);
    setMoreError(false);
    const request = version.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await fetchDiscoverCatalog({ ...filters, query, cursor: data.nextCursor, snapshot: data.snapshot, signal: abort.signal });
      if (request !== version.current || abort.signal.aborted) return;
      setData((current) => current ? { ...result, events: mergeCatalogEvents(current.events, result.events) } : result);
    } catch {
      if (request === version.current && !abort.signal.aborted) setMoreError(true);
    } finally {
      if (request === version.current && !abort.signal.aborted) {
        moreBusy.current = false;
        setLoadingMore(false);
      }
    }
  };

  const navigateToDetail = (path: string, onNavigate: (path: string) => void) => {
    if (searchPending || !data || phase !== 'ready') return;
    const cacheKey = window.history.state?.__discoverCatalogKey ?? crypto.randomUUID();
    saveCatalogReturn(cacheKey, { filters, query, data, filtersOpen, scrollY: window.scrollY });
    window.history.replaceState({ ...window.history.state, __discoverCatalogKey: cacheKey }, '');
    onNavigate(path);
    window.history.replaceState({ ...window.history.state, __discoverCatalogReturn: cacheKey }, '');
  };

  const clearFilters = () => {
    setFilters((current) => ({ ...DEFAULT_FILTERS, sort: current.sort }));
    onSearchChange?.('');
    setQuery('');
  };

  return {
    filters, setFilters, filtersOpen, setFiltersOpen, data, phase: searchPending ? 'loading' as const : phase, loadingMore, moreError,
    loadMore, refresh: () => setRevision((value) => value + 1), navigateToDetail, clearFilters,
  };
}
