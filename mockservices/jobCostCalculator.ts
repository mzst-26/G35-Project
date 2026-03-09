/**
 * jobCostCalculator.ts - Calculates job costs
 * 
 * Pure function that calculates labour cost, platform fee, and total.
 * No external dependencies or side effects - easy to test.
 * This is only a placeholder until backend is implemented.
 */

import { JobParameters, JobCostEstimate } from '@/types/job';

// Constants for cost calculation
const LABOUR_COST_PER_WORKER = 280;  // £280 per worker per day
const PLATFORM_FEE_PERCENTAGE = 0.1; // 10% platform fee

/**
 * Calculate cost estimate for a job
 * @param jobParams - Job parameters including worker count
 * @returns Cost breakdown with labour, fee, and total
 */
export function calculateCostEstimate(jobParams: JobParameters): JobCostEstimate {
  const workersNeeded = jobParams.workersNeeded || 1; // Default to 1 worker
  const labourCost = workersNeeded * LABOUR_COST_PER_WORKER;
  const platformFee = labourCost * PLATFORM_FEE_PERCENTAGE;
  const total = labourCost + platformFee;

  return {
    labourCost,
    platformFee,
    total,
  };
}
