// Status options shown on the job detail page
export type CompanyJobStatus = 'pending' | 'allocated' | 'in-progress' | 'completed' | 'cancelled';

// Payment status for the cost section
export type CompanyPaymentStatus = 'unpaid' | 'platform-fee-paid' | 'stripe-hold' | 'released';

// Simple worker info used on the job detail page
export interface CompanyJobWorker {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  jobsCompleted: number;
}

// Timeline item shown on the right side of the detail view
export interface CompanyJobTimelineItem {
  date: string;
  event: string;
  status: 'pending' | 'completed';
}

// Full job detail data
export interface CompanyJobDetail {
  id: string;
  title: string;
  company: string;
  trade: string;
  status: CompanyJobStatus;
  location: string;
  address: string;
  startDate: string;
  endDate: string;
  workersNeeded: number;
  description: string;
  requirements: string[];
  dailyRate: number;
  allocatedWorkers: CompanyJobWorker[];
  paymentId: string | null;
  paymentStatus: CompanyPaymentStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  platformFee: number;
  labourCost: number;
  totalCost: number;
  timeline: CompanyJobTimelineItem[];
}
