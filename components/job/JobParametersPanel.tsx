/**
 * JobParametersPanel - Sidebar showing extracted job parameters
 * Displays all job details and cost estimate when ready.
 * Stays visible while user chats (sticky positioning).
 */

'use client';

import { Sparkles, MapPin, Users, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobParameters, JobCostEstimate } from '@/types/job';
import { JobParameterItem } from './JobParameterItem';
import { JobCostEstimateCard } from './JobCostEstimateCard';

interface JobParametersPanelProps {
  jobParams: JobParameters;      // Job details extracted from chat
  showCostEstimate: boolean;     // Show cost section when job is complete
  costEstimate?: JobCostEstimate; // Cost breakdown
  onSubmit: () => void;           // Called when submit button clicked
}

export function JobParametersPanel({
  jobParams,
  showCostEstimate,
  costEstimate,
  onSubmit,
}: JobParametersPanelProps) {
  return (
    // sticky top-8: Stays visible when scrolling
    <Card className="shadow-2xl bg-white/80 border-white/20 sticky top-8">
      
      {/* Header */}
      <CardHeader className="border-b border-white/20 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>Job Details</CardTitle>
        </div>
        <p className="text-sm text-slate-500">Extracted parameters</p>
      </CardHeader>

      {/* Parameters list */}
      <CardContent className="pt-6 space-y-4">
        {/* Trade type - shown as badge */}
        <JobParameterItem
          icon={<FileText className="h-4 w-4" />}
          label="Trade Type"
          value={jobParams.tradeType}
          isBadge
        />

        {/* Location */}
        <JobParameterItem
          icon={<MapPin className="h-4 w-4" />}
          label="Location"
          value={jobParams.location}
        />

        {/* Number of workers */}
        <JobParameterItem
          icon={<Users className="h-4 w-4" />}
          label="Workers Needed"
          value={jobParams.workersNeeded}
        />

        {/* Start date */}
        <JobParameterItem
          icon={<Calendar className="h-4 w-4" />}
          label="Start Date"
          value={jobParams.startDate}
        />

        {/* Job description */}
        <JobParameterItem
          icon={<FileText className="h-4 w-4" />}
          label="Job Notes"
          value={jobParams.description}
        />

        {/* Cost estimate - only shown when all parameters collected */}
        {showCostEstimate && costEstimate && (
          <JobCostEstimateCard estimate={costEstimate} onSubmit={onSubmit} />
        )}
      </CardContent>
    </Card>
  );
}
