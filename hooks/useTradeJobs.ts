'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TradeUpcomingJob } from '@/types/trade-dashboard';
import { getTradeJobs } from '@/services/tradeJobsApi';

export interface TradeJobsStats {
  pending: number;
  upcoming: number;
  completed: number;
  completedEarnings: number;
}

export function useTradeJobs() {
  // Store job list data
  const [jobs, setJobs] = useState<TradeUpcomingJob[]>([]);
  // Simple loading and error flags
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load jobs once when the hook mounts
    let active = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getTradeJobs();
        if (active) {
          setJobs(data);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Failed to load jobs';
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo<TradeJobsStats>(() => {
    // Build counts for the stats cards
    return jobs.reduce(
      (acc, job) => {
        if (job.status === 'pending') acc.pending += 1;
        if (job.status === 'upcoming') acc.upcoming += 1;
        if (job.status === 'completed') {
          acc.completed += 1;
          acc.completedEarnings += job.pay * job.days;
        }
        return acc;
      },
      { pending: 0, upcoming: 0, completed: 0, completedEarnings: 0 }
    );
  }, [jobs]);

  return { jobs, stats, isLoading, error, setJobs } as const;
}
