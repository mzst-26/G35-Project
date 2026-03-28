'use client';

import { useMemo } from 'react';
import type { CompanyJob, CompanyJobStats } from '@/types/company-jobs';
import { coreGetJson } from '@/lib/core/client';
import { toCompanyJobs } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { toHookApiError } from '@/lib/core/error-envelope';
import { usePaginatedData, type PaginatedResponse } from '@/lib/data/pagination';

export interface UseCompanyJobsOptions {
  pageSize?: 25 | 50 | 100;
  pageNumber?: number;
}

export function useCompanyJobs(options?: UseCompanyJobsOptions) {
  const pageSize = options?.pageSize ?? 25;

  const {
    items: jobs,
    currentPage,
    total,
    isLoading,
    error,
    goToPage,
    setPageSize,
    refresh,
    hasNextPage,
  } = usePaginatedData<CompanyJob>(
    async (limit, offset) => {
      try {
        const data = await coreGetJson<unknown>(
          '/api/core/jobs',
          'Failed to load jobs',
          'COMPANY_JOBS_LOAD_FAILED',
          { limit, offset },
        );

        // Handle response that includes meta
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          const typedData = data as { data: unknown[]; meta: { total: number; limit: number; offset: number } };
          return {
            data: toCompanyJobs(typedData.data),
            meta: typedData.meta,
          };
        }

        // Fallback: assume data is array
        return {
          data: toCompanyJobs(Array.isArray(data) ? data : []),
          meta: { total: Array.isArray(data) ? data.length : 0, limit, offset },
        };
      } catch (caughtError) {
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
        throw caughtError;
      }
    },
    pageSize,
  );

  const stats = useMemo<CompanyJobStats>(() => {
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

  return {
    jobs,
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
