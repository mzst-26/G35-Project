'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TradePenalty, TradePenaltiesStats } from '@/types/trade-dashboard';
import { getTradePenalties } from '@/services/tradePenaltiesApi';

export function useTradePenalties() {
  // Store penalties list data
  const [penalties, setPenalties] = useState<TradePenalty[]>([]);
  // Simple loading and error flags
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load penalties once when the hook mounts
    let active = true;

    const loadPenalties = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getTradePenalties();
        if (active) {
          setPenalties(data);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Failed to load penalties';
          setError(message);
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

  return { penalties, stats, isLoading, error, setPenalties } as const;
}
