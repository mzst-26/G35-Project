export interface JobParameters {
  tradeType?: string;
  location?: string;
  workersNeeded?: number;
  startDate?: string; // ISO string or user-friendly format
  endDate?: string;
  description?: string;
}

export interface JobAllocationParams {
  trade: string;
  location: string;
  startDate: string;
  endDate: string;
  workersNeeded: number;
  description: string;
}

export interface JobCostEstimate {
  labourCost: number;
  platformFee: number;
  total: number;
}
