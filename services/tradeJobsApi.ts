// Mock Trade Jobs API Service
// TODO: later will replace this with the real API calls to backend

const REJECTION_PENALTY_FEE = 50; // GBP

export interface RejectionResponse {
  success: boolean;
  jobId: number;
  penaltyFee: number;
  message: string;
}

/**
 * Reject an upcoming job and apply penalty fee
 * @param jobId - ID of the job to reject
 * @param reason - Reason for rejection
 * @returns Response with penalty fee and status
 * 
 * TODO: Connect to backend API endpoint: POST /api/trade/jobs/{jobId}/reject
 * TODO: Persist rejection status to database
 * TODO: Deduct penalty fee from trade worker's account
 */
export async function rejectJob(
  jobId: number,
  reason: string
): Promise<RejectionResponse> {
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        jobId,
        penaltyFee: REJECTION_PENALTY_FEE,
        message: `Job rejected. A penalty fee of £${REJECTION_PENALTY_FEE} has been applied.`,
      });
    }, 500);
  });
}

/**
 * Get all jobs for a trade worker
 * TODO: Connect to backend API endpoint: GET /api/trade/jobs
 * TODO: Add filters for status, date range, search query
 */
export async function getTradeJobs() {
  // Mock implementation - will be replaced with API call
  return [];
}

/**
 * Get job details
 * TODO: Connect to backend API endpoint: GET /api/trade/jobs/{jobId}
 */
export async function getJobDetails(jobId: number) {
  // Mock implementation - will be replaced with API call
  return null;
}

/**
 * Accept/Confirm a pending job
 * TODO: Connect to backend API endpoint: POST /api/trade/jobs/{jobId}/accept
 */
export async function acceptJob(jobId: number) {
  // Mock implementation - will be replaced with API call
  return { success: true, jobId };
}
