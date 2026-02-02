'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CompanyPaymentListItem, CompanyPaymentSummary } from '@/types/company-payments';
import { listCompanyPayments } from '@/services/companyPaymentsApi';

export function useCompanyPayments() {
  // Store the payment list
  const [payments, setPayments] = useState<CompanyPaymentListItem[]>([]);
  // Track loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    listCompanyPayments()
      .then((data) => {
        if (!active) return;
        setPayments(data);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load payments';
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo<CompanyPaymentSummary>(() => {
    return payments.reduce(
      (acc, payment) => {
        if (payment.status === 'released') {
          acc.totalPaid += payment.totalAmount;
        }
        if (payment.status === 'stripe-hold') {
          acc.totalInStripeHold += payment.labourCost;
        }
        if (payment.status !== 'released') {
          acc.unpaidJobs += 1;
        }
        acc.platformFeesPaid += payment.platformFee;
        return acc;
      },
      { totalPaid: 0, totalInStripeHold: 0, unpaidJobs: 0, platformFeesPaid: 0 }
    );
  }, [payments]);

  return { payments, summary, isLoading, error } as const;
}
