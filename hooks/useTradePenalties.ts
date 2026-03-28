'use client';

import { useMemo } from 'react';
import type { TradePenalty, TradePenaltiesStats } from '@/types/trade-dashboard';
import { coreGetJson } from '@/lib/core/client';
import { toTradePenalties } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { toHookApiError } from '@/lib/core/error-envelope';
import { usePaginatedData } from '@/lib/data/pagination';

export interface UseTradePenaltiesOptions {
  pageSize?: 25 | 50 | 100;
  pageNumber?: number;
}

export function useTradePenalties(options?: UseTradePenaltiesOptions) {
  const pageSize = options?.pageSize ?? 25;

  const {
    items: penalties,
    currentPage,
    total,
    isLoading,
    error,
    goToPage,
    setPageSize,
    refresh,
    hasNextPage,
  } = usePaginatedData<TradePenalty>(
    async (limit, offset) => {
      try {
        const payload = await coreGetJson<unknown>(
          '/api/core/penalties',
          'Failed to load penalties',
          'TRADE_PENALTIES_LOAD_FAILED',
          { limit, offset },
        );

        // Handle response that includes meta
        if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload) {
          const typedData = payload as { data: unknown[]; meta: { total: number; limit: number; offset: number } };
          return {
            data: toTradePenalties(typedData.data),
            meta: typedData.meta,
          };
        }

        // Fallback: assume payload is array
        return {
          data: toTradePenalties(Array.isArray(payload) ? payload : []),
          meta: { total: Array.isArray(payload) ? payload.length : 0, limit, offset },
        };
      } catch (caughtError) {
        const apiError = toHookApiError(
          caughtError,
          'Failed to load penalties',
          'TRADE_PENALTIES_LOAD_FAILED',
        );
        captureFrontendError(apiError, {
          flow: 'trade_penalties',
          endpoint: '/api/core/penalties',
          action: 'list',
          role: 'trade',
        });
        captureFrontendMessage('Trade penalties request failed', {
          flow: 'trade_penalties',
          endpoint: '/api/core/penalties',
          action: 'list',
          role: 'trade',
          extra: {
            code: apiError.envelope.code,
            requestId: apiError.envelope.requestId,
            status: apiError.envelope.status,
          },
        });
        throw caughtError;
      }
    },
    pageSize,
  );

  // Calculate statistics from all loaded penalties
  const stats = useMemo<TradePenaltiesStats>(() => {
    return penalties.reduce(
      (acc, penalty) => {
        acc.total += penalty.amount;
        if (penalty.status === 'paid') acc.paid += penalty.amount;
        if (penalty.status === 'unpaid') acc.unpaid += penalty.amount;
        if (penalty.status === 'disputed') acc.disputed += penalty.amount;
        return acc;
      },
      { total: 0, paid: 0, unpaid: 0, disputed: 0 }
    );
  }, [penalties]);

  return {
    penalties,
    stats,
    isLoading,
    error,
    total,
    currentPage,
    pageSize,
    hasNextPage,
    goToPage,
    setPageSize,
    refresh,
  } as const;
}
