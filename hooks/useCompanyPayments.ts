'use client';

import { useMemo } from 'react';
import type { CompanyPaymentListItem, CompanyPaymentSummary } from '@/types/company-payments';
import { coreGetJson } from '@/lib/core/client';
import { toCompanyPayments } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { toHookApiError } from '@/lib/core/error-envelope';
import { usePaginatedData } from '@/lib/data/pagination';

export interface UseCompanyPaymentsOptions {
  pageSize?: number;
  pageNumber?: number;
}

export function useCompanyPayments(options?: UseCompanyPaymentsOptions) {
  const pageSize = options?.pageSize ?? 25;

  const {
    items: payments,
    currentPage,
    total,
    isLoading,
    error,
    goToPage,
    setPageSize,
    refresh,
    hasNextPage,
  } = usePaginatedData<CompanyPaymentListItem>(
    async (limit, offset) => {
      try {
        const payload = await coreGetJson<unknown>(
          '/api/core/payments',
          'Failed to load payments',
          'COMPANY_PAYMENTS_LOAD_FAILED',
          { limit, offset },
        );

        // Handle response that includes meta
        if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload) {
          const typedData = payload as { data: unknown[]; meta: { total: number; limit: number; offset: number } };
          return {
            data: toCompanyPayments(typedData.data),
            meta: typedData.meta,
          };
        }

        // Fallback: assume payload is array
        return {
          data: toCompanyPayments(Array.isArray(payload) ? payload : []),
          meta: { total: Array.isArray(payload) ? payload.length : 0, limit, offset },
        };
      } catch (caughtError) {
        const apiError = toHookApiError(caughtError, 'Failed to load payments', 'COMPANY_PAYMENTS_LOAD_FAILED');

        // Payments API is not yet available in core-platform in some environments.
        // Gracefully degrade to an empty list so dashboard pages continue to function.
        if (apiError.envelope.status === 404 || apiError.envelope.code === 'NOT_FOUND') {
          captureFrontendMessage('Recruiter payments endpoint unavailable - using empty dataset', {
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

          return {
            data: [],
            meta: { total: 0, limit, offset },
          };
        }

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
        throw caughtError;
      }
    },
    pageSize,
  );

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

  return {
    payments,
    summary,
    isLoading,
    error,
    total,
    currentPage,
    pageSize,
    hasNextPage,
    goToPage,
    setPageSize,
    refresh,
  } as const;
}

