import type { CompanyPaymentDetail, CompanyPaymentListItem } from '@/types/company-payments';

// Mock payment data for the company payments feature.
// Replace with real API calls when backend is ready.
const PAYMENTS_DATABASE: Record<string, CompanyPaymentDetail> = {
  'pay-1': {
    id: 'pay-1',
    jobId: '1',
    jobTitle: 'Office Electrical Rewiring',
    status: 'stripe-hold',
    date: '2025-11-24',
    invoice: 'INV-001',
    paymentMethod: 'Visa ending in 4242',
    labourCost: 560,
    platformFee: 56,
    totalAmount: 616,
    platformFeePaid: true,
    labourCostHeld: true,
    createdAt: '2025-11-24T10:30:00',
    paidAt: '2025-11-24T10:35:00',
    releasedAt: null,
    transactions: [
      {
        id: 'txn-1',
        date: '2025-11-24T10:35:00',
        description: 'Platform Fee Payment',
        amount: 56,
        status: 'completed',
        type: 'platform-fee',
      },
      {
        id: 'txn-2',
        date: '2025-11-24T10:35:00',
        description: 'Labour Cost - Held by Stripe',
        amount: 560,
        status: 'stripe-hold',
        type: 'stripe-hold',
      },
    ],
  },
  'pay-2': {
    id: 'pay-2',
    jobId: '2',
    jobTitle: 'Bathroom Plumbing Installation',
    status: 'platform-fee-paid',
    date: '2025-11-24',
    invoice: 'INV-002',
    paymentMethod: 'Mastercard ending in 5555',
    labourCost: 320,
    platformFee: 32,
    totalAmount: 352,
    platformFeePaid: true,
    labourCostHeld: false,
    createdAt: '2025-11-24T14:20:00',
    paidAt: '2025-11-24T14:25:00',
    releasedAt: null,
    transactions: [
      {
        id: 'txn-3',
        date: '2025-11-24T14:25:00',
        description: 'Platform Fee Payment',
        amount: 32,
        status: 'completed',
        type: 'platform-fee',
      },
    ],
    pendingStripeHold: {
      amount: 320,
      scheduledDate: '2025-11-27T00:00:00',
      description: 'Labour payment will be processed 1 day before job start',
    },
  },
  'pay-4': {
    id: 'pay-4',
    jobId: '4',
    jobTitle: 'Warehouse Painting',
    status: 'released',
    date: '2025-11-17',
    invoice: 'INV-004',
    paymentMethod: 'Visa ending in 4242',
    labourCost: 750,
    platformFee: 75,
    totalAmount: 825,
    platformFeePaid: true,
    labourCostHeld: false,
    createdAt: '2025-11-17T09:00:00',
    paidAt: '2025-11-17T09:05:00',
    releasedAt: '2025-11-21T10:00:00',
    transactions: [
      {
        id: 'txn-4',
        date: '2025-11-17T09:05:00',
        description: 'Platform Fee Payment',
        amount: 75,
        status: 'completed',
        type: 'platform-fee',
      },
      {
        id: 'txn-5',
        date: '2025-11-17T09:05:00',
        description: 'Labour Cost - Held by Stripe',
        amount: 750,
        status: 'completed',
        type: 'stripe-hold',
      },
      {
        id: 'txn-6',
        date: '2025-11-21T10:00:00',
        description: 'Stripe Hold Released to Workers',
        amount: 750,
        status: 'completed',
        type: 'release',
      },
    ],
  },
};

export async function listCompanyPayments(): Promise<CompanyPaymentListItem[]> {
  // TODO: Replace with real API call.
  return Promise.resolve(
    Object.values(PAYMENTS_DATABASE).map(({ transactions, pendingStripeHold, ...item }) => item)
  );
}

export async function getCompanyPaymentDetail(paymentId: string): Promise<CompanyPaymentDetail | null> {
  // TODO: Replace with real API call.
  return Promise.resolve(PAYMENTS_DATABASE[paymentId] ?? null);
}
