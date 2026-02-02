// Status values for payments
export type CompanyPaymentStatus =
  | 'unpaid'
  | 'platform-fee-paid'
  | 'stripe-hold'
  | 'released'
  | 'refunded';

// Simple transaction item for the payment detail page
export interface CompanyPaymentTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'completed' | 'stripe-hold' | 'pending';
  type: 'platform-fee' | 'stripe-hold' | 'release';
}

// Light-weight payment info used in the payments list
export interface CompanyPaymentListItem {
  id: string;
  jobId: string;
  jobTitle: string;
  status: CompanyPaymentStatus;
  date: string;
  invoice: string;
  paymentMethod: string | null;
  labourCost: number;
  platformFee: number;
  totalAmount: number;
}

// Full payment detail info for the detail view
export interface CompanyPaymentDetail extends CompanyPaymentListItem {
  createdAt: string;
  paidAt: string | null;
  releasedAt: string | null;
  platformFeePaid: boolean;
  labourCostHeld: boolean;
  transactions: CompanyPaymentTransaction[];
  pendingStripeHold?: {
    amount: number;
    scheduledDate: string;
    description: string;
  };
}

// Summary values for the payment header cards
export interface CompanyPaymentSummary {
  totalPaid: number;
  totalInStripeHold: number;
  unpaidJobs: number;
  platformFeesPaid: number;
}
