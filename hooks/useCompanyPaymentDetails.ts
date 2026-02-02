'use client';

import { useEffect, useState } from 'react';
import type { CompanyPaymentDetail } from '@/types/company-payments';
import { getCompanyPaymentDetail } from '@/services/companyPaymentsApi';

export function useCompanyPaymentDetails(paymentId: string | null) {
  // Store a single payment record
  const [payment, setPayment] = useState<CompanyPaymentDetail | null>(null);
  // Track loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    getCompanyPaymentDetail(paymentId)
      .then((data) => {
        if (!active) return;
        setPayment(data);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load payment details';
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [paymentId]);

  return { payment, isLoading, error } as const;
}
