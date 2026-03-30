import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { JobParameters, JobCostEstimate } from '@/types/job';
import {
  Sparkles,
  FileText,
  MapPin,
  Users,
  Calendar,
  Coins,
} from 'lucide-react';

interface JobParametersPanelProps {
  jobParams: JobParameters;
  isComplete: boolean;
  onSubmit: () => void | Promise<void>;
  isPriceApproved: boolean;
  onPriceApprovalChange: (approved: boolean) => void;
  isSubmitting: boolean;
}

function calculateCostEstimate(workersNeeded: number): JobCostEstimate {
  const labourCost = workersNeeded * 280;
  const platformFee = labourCost * 0.1;
  const total = labourCost + platformFee;

  return { labourCost, platformFee, total };
}

export function JobParametersPanel({
  jobParams,
  isComplete,
  onSubmit,
  isPriceApproved,
  onPriceApprovalChange,
  isSubmitting,
}: JobParametersPanelProps) {
  const estimate = jobParams.workersNeeded
    ? calculateCostEstimate(jobParams.workersNeeded)
    : null;

  return (
    <Card className="shadow-2xl bg-white/80 border-white/20 sticky top-8">
      <CardHeader className="border-b border-white/20 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>Job Details</CardTitle>
        </div>
        <p className="text-sm text-slate-500">Extracted parameters</p>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Trade Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4" />
            <span>Trade Type</span>
          </div>
          {jobParams.tradeType ? (
            <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
              {jobParams.tradeType}
            </Badge>
          ) : (
            <p className="text-sm text-slate-400">Not set</p>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4" />
            <span>Location</span>
          </div>
          {jobParams.location ? (
            <div>
              <p className="text-sm text-slate-900">{jobParams.location}</p>
              <div className="mt-2 h-32 bg-gradient-to-br from-slate-200 to-blue-200 rounded-xl flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not set</p>
          )}
        </div>

        {/* Workers Needed */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4" />
            <span>Workers Needed</span>
          </div>
          {jobParams.workersNeeded ? (
            <p className="text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
              {jobParams.workersNeeded}
            </p>
          ) : (
            <p className="text-sm text-slate-400">Not set</p>
          )}
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>Start Date</span>
          </div>
          {jobParams.startDate ? (
            <p className="text-sm text-slate-900">{jobParams.startDate}</p>
          ) : (
            <p className="text-sm text-slate-400">Not set</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4" />
            <span>Job Notes</span>
          </div>
          {jobParams.description ? (
            <p className="text-sm text-slate-900">{jobParams.description}</p>
          ) : (
            <p className="text-sm text-slate-400">Not set</p>
          )}
        </div>

        {/* Cost Estimate */}
        {isComplete && estimate && (
          <>
            <Separator />
            <div className="space-y-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/50">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <Coins className="h-4 w-4" />
                <span>Estimated Cost</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Labour Cost</span>
                  <span className="text-slate-900">£{estimate.labourCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Platform Fee (10%)</span>
                  <span className="text-slate-900">£{estimate.platformFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-slate-900">Total Estimate</span>
                  <span className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                    £{estimate.total.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Basic price shown for now. Job is created only after you approve this quote.
              </p>

              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={isPriceApproved}
                  onChange={(event) => onPriceApprovalChange(event.target.checked)}
                  disabled={isSubmitting}
                />
                <span>I approve this price and want to create the job.</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-4 shadow-lg hover:shadow-xl transition-all"
              onClick={onSubmit}
              disabled={!isPriceApproved || isSubmitting}
            >
              {isSubmitting ? 'Creating Job...' : 'Approve Price & Create Job'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
