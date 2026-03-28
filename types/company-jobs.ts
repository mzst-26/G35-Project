import type { JobListItemDto } from '@/types/core-dto-contracts';

export type CompanyJobStatus = 'pending' | 'allocated' | 'in-progress' | 'completed' | 'cancelled';

export type CompanyJobSourceStatus = JobListItemDto['status'];

// Basic job card data for the dashboard list
export interface CompanyJob {
  id: string;
  title: string;
  trade: string;
  status: CompanyJobStatus;
  sourceStatus?: CompanyJobSourceStatus;
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

export function normalizeCompanyJobStatus(status: CompanyJobStatus | CompanyJobSourceStatus): CompanyJobStatus {
  switch (status) {
    case 'draft':
    case 'open':
    case 'pending_quote':
    case 'quoted':
    case 'pending_payment':
      return 'pending';
    case 'paid':
    case 'allocating':
    case 'allocated':
      return 'allocated';
    case 'in_progress':
    case 'in-progress':
      return 'in-progress';
    case 'closed':
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    default:
      return 'pending';
  }
}
