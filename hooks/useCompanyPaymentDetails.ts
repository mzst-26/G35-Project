'use client';

import { useEffect, useState } from 'react';
import type { CompanyPaymentDetail } from '@/types/company-payments';
import { getCompanyPaymentDetail } from '@/mockservices/companyPaymentsApi';

export function useCompanyPaymentDetails(paymentId: string | null) {
  // Store a single payment record
  const [payment, setPayment] = useState<CompanyPaymentDetail | null>(null);
  // Track loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;

    const loadPayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCompanyPaymentDetail(paymentId);
        if (active) {
          setPayment(data);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Failed to load payment details';
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPayment();

    return () => {
      active = false;
    };
  }, [paymentId]);

  return { payment, isLoading, error } as const;
}
