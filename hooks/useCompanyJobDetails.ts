'use client';

import { useEffect, useState } from 'react';
import type { CompanyJobDetail } from '@/types/company-job-detail';
import { getCompanyJobDetail } from '@/services/companyJobDetailsApi';

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
      return;
    }

    // Use a flag so we don't set state after unmount
    let active = true;
    setIsLoading(true);
    setError(null);

    getCompanyJobDetail(jobId)
      .then((data) => {
        if (!active) return;
        setJob(data);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load job details';
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId]);

  return { job, isLoading, error } as const;
}
