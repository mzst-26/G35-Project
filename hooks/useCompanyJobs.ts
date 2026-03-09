'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CompanyJob, CompanyJobStats } from '@/types/company-jobs';
import { listRecentCompanyJobs } from '@/mockservices/companyJobsApi';

export function useCompanyJobs() {
  // Store job list data for the dashboard
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  // Simple loading and error flags
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load jobs once when the component mounts
    let active = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await listRecentCompanyJobs();
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

  return { jobs, stats, isLoading, error } as const;
}
