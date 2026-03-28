'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { CompanyJobCard } from '@/components/recruiter_dashboard/CompanyJobCard';
import { useCompanyJobs } from '@/hooks/useCompanyJobs';
import { useRouter } from 'next/navigation';

export default function JobsPage() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);

  const {
    jobs,
    isLoading,
    error,
    total,
    currentPage,
    pageSize: pageSizeState,
    hasNextPage,
    goToPage,
    setPageSize: setPageSizeHook,
  } = useCompanyJobs({ pageSize });

  const handlePageSizeChange = async (size: 25 | 50 | 100) => {
    setPageSize(size);
    await setPageSizeHook(size);
  };

  const handleNextPage = async () => {
    if (hasNextPage) {
      await goToPage(currentPage + 1);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
      await goToPage(currentPage - 1);
    }
  };

  const handleViewJob = (jobId: string) => {
    router.push(`/company/dashboard?jobId=${jobId}`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl text-slate-900 mb-2">All Jobs</h1>
        <p className="text-slate-600">Browse and manage all your job requests</p>
      </div>

      {/* Top pagination controls */}
      {total > 0 && (
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardContent className="p-6">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSizeState}
              total={total}
              hasNextPage={hasNextPage}
              isLoading={isLoading}
              onPageSizeChange={handlePageSizeChange}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && jobs.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-600 text-sm">Loading jobs...</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && jobs.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-600 text-sm">No jobs found.</p>
          </CardContent>
        </Card>
      )}

      {/* Jobs list */}
      {jobs.length > 0 && (
        <div className="space-y-4 mb-6">
          {jobs.map((job) => (
            <CompanyJobCard
              key={job.id}
              job={job}
              onOpen={handleViewJob}
              onViewDetails={handleViewJob}
            />
          ))}
        </div>
      )}

      {/* Bottom pagination controls */}
      {total > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSizeState}
              total={total}
              hasNextPage={hasNextPage}
              isLoading={isLoading}
              onPageSizeChange={handlePageSizeChange}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
