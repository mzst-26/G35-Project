'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TradePenalty, TradePenaltiesStats } from '@/types/trade-dashboard';
import { coreGetJson } from '@/lib/core/client';
import { toTradePenalties } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, toHookApiError } from '@/lib/core/error-envelope';

export function useTradePenalties() {
  // Store penalties list data
  const [penalties, setPenalties] = useState<TradePenalty[]>([]);
  // Simple loading and error flags
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    // Load penalties once when the hook mounts
    let active = true;

    const loadPenalties = async () => {
      setIsLoading(true);
      setError(null);
      setErrorEnvelope(null);

      try {
        const payload = await coreGetJson<unknown>(
          '/api/core/penalties',
          'Failed to load penalties',
          'TRADE_PENALTIES_LOAD_FAILED',
          { limit: 50 },
        );
        const data = toTradePenalties(payload);
        if (active) {
          setPenalties(data);
        }
      } catch (caughtError) {
        if (active) {
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
          setError(apiError.envelope.message);
          setErrorEnvelope(apiError.envelope);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPenalties();

    return () => {
      active = false;
    };
  }, []);

  // Calculate statistics
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

  return { penalties, stats, isLoading, error, errorEnvelope, setPenalties } as const;
}
