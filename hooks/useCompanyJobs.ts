'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CompanyJob, CompanyJobStats } from '@/types/company-jobs';
import { coreGetJson } from '@/lib/core/client';
import { toCompanyJobs } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, toHookApiError } from '@/lib/core/error-envelope';

export function useCompanyJobs() {
  // Store job list data for the dashboard
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  // Simple loading and error flags
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    // Load jobs once when the component mounts
    let active = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);
      setErrorEnvelope(null);

      try {
        const data = await coreGetJson<unknown>(
          '/api/core/jobs',
          'Failed to load jobs',
          'COMPANY_JOBS_LOAD_FAILED',
          { limit: 20 },
        );
        if (active) {
          setJobs(toCompanyJobs(data));
        }
      } catch (caughtError) {
        if (active) {
          const apiError = toHookApiError(caughtError, 'Failed to load jobs', 'COMPANY_JOBS_LOAD_FAILED');
          captureFrontendError(apiError, {
            flow: 'recruiter_jobs',
            endpoint: '/api/core/jobs',
            action: 'list',
            role: 'recruiter',
          });
          captureFrontendMessage('Recruiter jobs request failed', {
            flow: 'recruiter_jobs',
            endpoint: '/api/core/jobs',
            action: 'list',
            role: 'recruiter',
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

  const stats = useMemo<CompanyJobStats>(() => {
    // Build counts for the stats cards
    return jobs.reduce(
      (acc, job) => {
        if (job.status === 'pending') acc.pending += 1;
        if (job.status === 'allocated') acc.allocated += 1;
        if (job.status === 'in-progress') acc.inProgress += 1;
        if (job.status === 'completed') acc.completed += 1;
        return acc;
      },
      { pending: 0, allocated: 0, inProgress: 0, completed: 0 }
    );
  }, [jobs]);

  return { jobs, stats, isLoading, error, errorEnvelope } as const;
}
