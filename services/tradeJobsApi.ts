// Mock Trade Jobs API Service
// TODO: later will replace this with the real API calls to backend

import type { TradeUpcomingJob } from '@/types/trade-dashboard';

const REJECTION_PENALTY_FEE = 50; // GBP

// Mock jobs data - TODO: Replace with API call
const mockJobs: TradeUpcomingJob[] = [
  {
    id: 1,
    title: "Emergency Repair",
    company: "Retail Solutions",
    location: "Birmingham, B1",
    date: "2026-03-02",
    pay: 450,
    days: 5,
    status: "pending",
    description: "Urgent electrical repair needed",
    actionByHours: 12,
  },
  {
    id: 3,
    title: "Residential Installation",
    company: "Property Group",
    location: "Manchester, M1",
    date: "2026-02-28",
    pay: 320,
    days: 3,
    status: "pending",
    description: "New electrical installation in residential property",
    actionByHours: 24,
  },
  {
    id: 2,
    title: "Office Lighting Upgrade",
    company: "Business Solutions Ltd",
    location: "London, EC2",
    date: "2026-03-05",
    pay: 300,
    days: 2,
    status: "upcoming",
    description: "LED lighting installation throughout office",
  },
  {
    id: 7,
    title: "Factory Electrical Work",
    company: "Manufacturing Co",
    location: "Sheffield, S1",
    date: "2026-03-10",
    pay: 350,
    days: 4,
    status: "upcoming",
    description: "Industrial electrical system installation",
  },
  {
    id: 4,
    title: "Warehouse Wiring",
    company: "Logistics Ltd",
    location: "Leeds, LS1",
    date: "2026-02-20",
    pay: 380,
    days: 4,
    status: "completed",
    description: "Completed warehouse electrical system",
    completedDate: "2026-02-23",
  },
  {
    id: 8,
    title: "Shop Rewiring",
    company: "Retail Solutions",
    location: "Bristol, BS1",
    date: "2026-02-15",
    pay: 350,
    days: 5,
    status: "completed",
    description: "Complete shop electrical rewiring",
    completedDate: "2026-02-19",
  },
];

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
export async function getTradeJobs(): Promise<TradeUpcomingJob[]> {
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockJobs);
    }, 300);
  });
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
