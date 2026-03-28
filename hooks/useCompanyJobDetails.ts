'use client';

import { useEffect, useState } from 'react';
import type { CompanyJobDetail } from '@/types/company-job-detail';
import { coreGetJson } from '@/lib/core/client';
import { toCompanyJobDetail } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, toHookApiError } from '@/lib/core/error-envelope';

export function useCompanyJobDetails(jobId: string | null) {
  // Store one job detail record
  const [job, setJob] = useState<CompanyJobDetail | null>(null);
  // Track loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    // Stop early if there is no job id
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      setError(null);
      setErrorEnvelope(null);
      return;
    }

    // Use a flag so we don't set state after unmount
    let active = true;

    const loadJob = async () => {
      setIsLoading(true);
      setError(null);
      setErrorEnvelope(null);

      try {
        const payload = await coreGetJson<unknown>(
          `/api/core/jobs/${jobId}`,
          'Failed to load job details',
          'COMPANY_JOB_DETAILS_LOAD_FAILED',
        );

        const data = toCompanyJobDetail(payload);
        if (active) {
          setJob(data);
        }
      } catch (caughtError) {
        if (active) {
          const apiError = toHookApiError(
            caughtError,
            'Failed to load job details',
            'COMPANY_JOB_DETAILS_LOAD_FAILED',
          );
          captureFrontendError(apiError, {
            flow: 'recruiter_job_details',
            endpoint: `/api/core/jobs/${jobId}`,
            action: 'detail',
            role: 'recruiter',
          });
          captureFrontendMessage('Recruiter job detail request failed', {
            flow: 'recruiter_job_details',
            endpoint: `/api/core/jobs/${jobId}`,
            action: 'detail',
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

    loadJob();

    return () => {
      active = false;
    };
  }, [jobId]);

  return { job, isLoading, error, errorEnvelope } as const;
}
