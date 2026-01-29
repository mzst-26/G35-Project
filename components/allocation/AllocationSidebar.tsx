'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobAllocationParams } from '@/types/job';

interface AllocationSidebarProps {
  jobParams: JobAllocationParams;
  onBack: () => void;
}

/**
 * Placeholder component for job allocation
 * TODO: Implement full allocation logic
 */

export default function AllocationSidebar({ jobParams, onBack }: AllocationSidebarProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Chat
      </Button>
      
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Job Allocation</h1>
        
        <div className="space-y-4">
          <div>
            <span className="font-semibold">Trade:</span> {jobParams.trade}
          </div>
          <div>
            <span className="font-semibold">Location:</span> {jobParams.location}
          </div>
          <div>
            <span className="font-semibold">Workers Needed:</span> {jobParams.workersNeeded}
          </div>
          <div>
            <span className="font-semibold">Start Date:</span> {jobParams.startDate}
          </div>
          <div>
            <span className="font-semibold">Description:</span> {jobParams.description}
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-slate-600">
            TODO: Implement worker allocation, matching algorithm, and job posting logic
          </p>
        </div>
      </div>
    </div>
  );
}
