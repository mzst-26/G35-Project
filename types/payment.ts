export interface PaymentSummary {
  totalPaid: number;
  totalInStripe: number;
  platformFeesPaid: number;
  unpaidJobs: number;
}

export interface JobHistory {
  id: number;
  jobTitle: string;
  tradesperson: string;
  amount: number;
  outstanding: number;
  status: 'completed' | 'overdue' | 'upcoming';
  date: string;
}

export type JobStatus = 'completed' | 'overdue' | 'upcoming';
