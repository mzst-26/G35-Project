'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CompanyPaymentListItem, CompanyPaymentSummary } from '@/types/company-payments';
import { coreGetJson } from '@/lib/core/client';
import { toCompanyPayments } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, toHookApiError } from '@/lib/core/error-envelope';

export function useCompanyPayments() {
  // Store the payment list
  const [payments, setPayments] = useState<CompanyPaymentListItem[]>([]);
  // Track loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setError(null);
      setErrorEnvelope(null);

      try {
        const payload = await coreGetJson<unknown>(
          '/api/core/payments',
          'Failed to load payments',
          'COMPANY_PAYMENTS_LOAD_FAILED',
          { limit: 50 },
        );
        const data = toCompanyPayments(payload);
        if (active) {
          setPayments(data);
        }
      } catch (caughtError) {
        if (active) {
          const apiError = toHookApiError(caughtError, 'Failed to load payments', 'COMPANY_PAYMENTS_LOAD_FAILED');
          captureFrontendError(apiError, {
            flow: 'recruiter_payments',
            endpoint: '/api/core/payments',
            action: 'list',
            role: 'recruiter',
          });
          captureFrontendMessage('Recruiter payments request failed', {
            flow: 'recruiter_payments',
            endpoint: '/api/core/payments',
            action: 'list',
            role: 'recruiter',
            extra: {
              code: apiError.envelope.code,
              requestId: apiError.envelope.requestId,
              status: apiError.envelope.status,
            },
          });
          setError(apiError.envelope.message);
          setErrorEnvelope(apiError.envelope);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPayments();

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

  return { payments, summary, isLoading, error, errorEnvelope } as const;
}
