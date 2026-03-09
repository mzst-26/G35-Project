'use client';

import { useEffect, useState } from 'react';
import type { CompanyJobDetail } from '@/types/company-job-detail';
import { getCompanyJobDetail } from '@/mockservices/companyJobDetailsApi';

export function useCompanyJobDetails(jobId: string | null) {
  // Store one job detail record
  const [job, setJob] = useState<CompanyJobDetail | null>(null);
  // Track loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Stop early if there is no job id
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Use a flag so we don't set state after unmount
    let active = true;

    const loadJob = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCompanyJobDetail(jobId);
        if (active) {
          setJob(data);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Failed to load job details';
          setError(message);
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

  return { job, isLoading, error } as const;
}
