/**
 * JobCostEstimateCard - Shows cost breakdown and submit button
 * Displays labour cost, platform fee, total, and submit button.
 */

'use client';

import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { JobCostEstimate } from '@/types/job';

interface JobCostEstimateProps {
  estimate: JobCostEstimate;  // Cost breakdown data
  onSubmit: () => void;        // Called when submit button clicked
}

export function JobCostEstimateCard({ estimate, onSubmit }: JobCostEstimateProps) {
  return (
    <>
      <Separator />
      
      {/* Cost breakdown card */}
      <div className="space-y-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/50">
        <div className="flex items-center gap-2 text-sm text-blue-900">
          <Coins className="h-4 w-4" />
          <span>Estimated Cost</span>
        </div>
        
        {/* Cost items */}
        <div className="space-y-2">
          {/* Labour cost */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Labour Cost</span>
            <span className="text-slate-900">£{estimate.labourCost.toFixed(2)}</span>
          </div>
          
          {/* Platform fee */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Platform Fee (10%)</span>
            <span className="text-slate-900">£{estimate.platformFee.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          {/* Total */}
          <div className="flex justify-between">
            <span className="text-slate-900">Total Estimate</span>
            <span className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              £{estimate.total.toFixed(2)}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-slate-600">Final price confirmed after allocation</p>
      </div>

      {/* Submit button */}
      <Button
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-4 shadow-lg hover:shadow-xl transition-all"
        onClick={onSubmit}
      >
        Submit Job Request
      </Button>
    </>
  );
}
