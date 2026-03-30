'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PageCache } from './cache';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface UsePaginatedDataReturn<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => Promise<void>;
  setPageSize: (size: 25 | 50 | 100) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function usePaginatedData<T>(
  fetcher: (limit: number, offset: number) => Promise<PaginatedResponse<T>>,
  initialPageSize: number = 25,
): UsePaginatedDataReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef(new PageCache());

  const getCacheKey = useCallback(
    (page: number, size: number): string => `page_${size}_${page}`,
    [],
  );

  const loadPage = useCallback(
    async (pageNum: number, size: number, bypassCache = false) => {
      const cacheKey = getCacheKey(pageNum, size);

      if (!bypassCache && cacheRef.current.has(cacheKey)) {
        const cachedData = cacheRef.current.get<PaginatedResponse<T>>(cacheKey);
        if (cachedData) {
          setItems(cachedData.data);
          setTotal(cachedData.meta.total);
          setError(null);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const offset = (pageNum - 1) * size;
        const response = await fetcher(size, offset);

        cacheRef.current.set(cacheKey, response, DEFAULT_CACHE_TTL_MS);

        setItems(response.data);
        setTotal(response.meta.total);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMsg);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetcher, getCacheKey],
  );

  useEffect(() => {
    // Load first page on mount
    loadPage(1, initialPageSize);
  }, []);

  const goToPage = useCallback(
    async (page: number) => {
      setCurrentPage(page);
      await loadPage(page, pageSize);
    },
    [pageSize, loadPage],
  );

  const setPageSize = useCallback(
    async (size: 25 | 50 | 100) => {
      setPageSizeState(size);
      setCurrentPage(1);
      await loadPage(1, size);
    },
    [loadPage],
  );

  const refresh = useCallback(async () => {
    await loadPage(currentPage, pageSize, true);
  }, [currentPage, pageSize, loadPage]);

  const hasNextPage = items.length > 0 && currentPage * pageSize < total;

  return {
    items,
    currentPage,
    pageSize,
    total,
    hasNextPage,
    isLoading,
    error,
    goToPage,
    setPageSize,
    refresh,
  };
}
