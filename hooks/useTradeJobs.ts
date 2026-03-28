'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TradeUpcomingJob } from '@/types/trade-dashboard';
import { coreGetJson } from '@/lib/core/client';
import { toTradeJobs } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, toHookApiError } from '@/lib/core/error-envelope';

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
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    // Load jobs once when the hook mounts
    let active = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);
      setErrorEnvelope(null);

      try {
        const payload = await coreGetJson<unknown>(
          '/api/core/jobs',
          'Failed to load jobs',
          'TRADE_JOBS_LOAD_FAILED',
          { assignee: 'self', limit: 50 },
        );
        const data = toTradeJobs(payload);
        if (active) {
          setJobs(data);
        }
      } catch (caughtError) {
        if (active) {
          const apiError = toHookApiError(caughtError, 'Failed to load jobs', 'TRADE_JOBS_LOAD_FAILED');
          captureFrontendError(apiError, {
            flow: 'trade_jobs',
            endpoint: '/api/core/jobs',
            action: 'list',
            role: 'trade',
          });
          captureFrontendMessage('Trade jobs request failed', {
            flow: 'trade_jobs',
            endpoint: '/api/core/jobs',
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

  return { jobs, stats, isLoading, error, errorEnvelope, setJobs } as const;
}
