import type {
  CompanyPaymentDetailDto,
  CompanyPaymentListItemDto,
  CompanyPaymentSummaryDto,
} from '@/types/core-dto-contracts';

// Status values for payments
export type CompanyPaymentStatus = CompanyPaymentListItemDto['status'];

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
  id: CompanyPaymentListItemDto['id'];
  jobId: CompanyPaymentListItemDto['jobId'];
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
  totalPaid: CompanyPaymentSummaryDto['totalPaid'];
  totalInStripeHold: CompanyPaymentSummaryDto['totalInStripeHold'];
  unpaidJobs: CompanyPaymentSummaryDto['unpaidJobs'];
  platformFeesPaid: CompanyPaymentSummaryDto['platformFeesPaid'];
}

export type CompanyPaymentContractShape = CompanyPaymentDetailDto;
