import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ChantPage,
  type ChantSearchOptions,
  searchChants,
} from '@/database/chant-database';
import type { Chant } from '@/types';

const PAGE_SIZE = 30;

type SearchState = {
  items: Chant[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
};

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'La recherche locale a échoué.';
}

export function useLocalChantSearch(options: ChantSearchOptions, debounceMs = 0) {
  const optionsKey = JSON.stringify(options);
  const stableOptions = useMemo(() => options, [optionsKey]);
  const [state, setState] = useState<SearchState>({
    items: [],
    total: 0,
    loading: true,
    loadingMore: false,
    error: null,
  });
  const requestId = useRef(0);
  const loadingMore = useRef(false);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let active = true;
    setState((current) => ({ ...current, items: [], total: 0, loading: true, loadingMore: false, error: null }));
    loadingMore.current = false;
    if (stableOptions.enabled === false) {
      setState({ items: [], total: 0, loading: false, loadingMore: false, error: null });
      return () => { active = false; };
    }

    const execute = async () => {
      try {
        const page = await searchChants({ ...stableOptions, limit: PAGE_SIZE, offset: 0 });
        if (active && requestId.current === currentRequest) {
          setState({ items: page.items, total: page.total, loading: false, loadingMore: false, error: null });
        }
      } catch (error) {
        if (active && requestId.current === currentRequest) {
          setState({ items: [], total: 0, loading: false, loadingMore: false, error: messageFor(error) });
        }
      }
    };
    const timeout = setTimeout(() => { void execute(); }, debounceMs);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [debounceMs, stableOptions]);

  const loadMore = useCallback(async () => {
    if (loadingMore.current || state.loading || state.loadingMore || state.error || state.items.length >= state.total) {
      return;
    }
    const currentRequest = requestId.current;
    loadingMore.current = true;
    setState((current) => ({ ...current, loadingMore: true }));
    try {
      const page: ChantPage = await searchChants({
        ...stableOptions,
        limit: PAGE_SIZE,
        offset: state.items.length,
      });
      if (requestId.current === currentRequest) {
        setState((current) => ({
          ...current,
          items: [...current.items, ...page.items],
          total: page.total,
          loadingMore: false,
        }));
      }
    } catch (error) {
      if (requestId.current === currentRequest) {
        setState((current) => ({ ...current, loadingMore: false, error: messageFor(error) }));
      }
    } finally {
      loadingMore.current = false;
    }
  }, [stableOptions, state.error, state.items.length, state.loading, state.loadingMore, state.total]);

  return {
    ...state,
    hasMore: state.items.length < state.total,
    loadMore,
  };
}
