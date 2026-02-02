// Simple status list for company jobs
export type CompanyJobStatus = 'pending' | 'allocated' | 'in-progress' | 'completed';

// Basic job card data for the dashboard list
export interface CompanyJob {
  id: string;
  title: string;
  trade: string;
  status: CompanyJobStatus;
  workers: number;
  date: string; // ISO date string (yyyy-mm-dd)
  location: string;
}

// Counts for the stats cards
export interface CompanyJobStats {
  pending: number;
  allocated: number;
  inProgress: number;
  completed: number;
}
