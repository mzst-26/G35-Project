'use client';

import { useEffect, useState } from 'react';
import type { CompanyPaymentDetail } from '@/types/company-payments';
import { coreGetJson } from '@/lib/core/client';
import { toCompanyPaymentDetail } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, toHookApiError } from '@/lib/core/error-envelope';

export function useCompanyPaymentDetails(paymentId: string | null) {
  // Store a single payment record
  const [payment, setPayment] = useState<CompanyPaymentDetail | null>(null);
  // Track loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      setIsLoading(false);
      setError(null);
      setErrorEnvelope(null);
      return;
    }

    let active = true;

    const loadPayment = async () => {
      setIsLoading(true);
      setError(null);
      setErrorEnvelope(null);

      try {
        const payload = await coreGetJson<unknown>(
          `/api/core/payments/${paymentId}`,
          'Failed to load payment details',
          'COMPANY_PAYMENT_DETAILS_LOAD_FAILED',
        );
        const data = toCompanyPaymentDetail(payload);
        if (active) {
          setPayment(data);
        }
      } catch (caughtError) {
        if (active) {
          const apiError = toHookApiError(
            caughtError,
            'Failed to load payment details',
            'COMPANY_PAYMENT_DETAILS_LOAD_FAILED',
          );
          captureFrontendError(apiError, {
            flow: 'recruiter_payments',
            endpoint: `/api/core/payments/${paymentId}`,
            action: 'detail',
            role: 'recruiter',
          });
          captureFrontendMessage('Recruiter payment detail request failed', {
            flow: 'recruiter_payments',
            endpoint: `/api/core/payments/${paymentId}`,
            action: 'detail',
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

    loadPayment();

    return () => {
      active = false;
    };
  }, [paymentId]);

  return { payment, isLoading, error, errorEnvelope } as const;
}
