'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useCompanyPayments } from '@/hooks/useCompanyPayments';

export default function PaymentsPage() {
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);

  const {
    payments,
    summary,
    isLoading,
    error,
    total,
    currentPage,
    pageSize: pageSizeState,
    hasNextPage,
    goToPage,
    setPageSize: setPageSizeHook,
  } = useCompanyPayments({ pageSize });

  const handlePageSizeChange = async (size: 25 | 50 | 100) => {
    setPageSize(size);
    await setPageSizeHook(size);
  };

  const handleNextPage = async () => {
    if (hasNextPage) {
      await goToPage(currentPage + 1);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
      await goToPage(currentPage - 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl text-slate-900 mb-2">Payments</h1>
        <p className="text-slate-600">View and manage payment transactions</p>
      </div>

      {/* Summary cards */}
      {error === null && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl text-slate-900 font-semibold">{formatCurrency(summary.totalPaid)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Stripe Hold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl text-slate-900 font-semibold">{formatCurrency(summary.totalInStripeHold)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Platform Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl text-slate-900 font-semibold">{formatCurrency(summary.platformFeesPaid)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Unpaid Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl text-slate-900 font-semibold">{summary.unpaidJobs}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top pagination controls */}
      {total > 0 && (
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardContent className="p-6">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSizeState}
              total={total}
              hasNextPage={hasNextPage}
              isLoading={isLoading}
              onPageSizeChange={handlePageSizeChange}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && payments.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-600 text-sm">Loading payments...</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && payments.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-600 text-sm">No payments found.</p>
          </CardContent>
        </Card>
      )}

      {/* Payments table */}
      {payments.length > 0 && (
        <Card className="border-slate-200 shadow-sm mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Job ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Platform Fee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.jobId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{payment.jobId}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{formatCurrency(payment.totalAmount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{formatCurrency(payment.platformFee)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'released'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'stripe-hold'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(payment.date).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bottom pagination controls */}
      {total > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSizeState}
              total={total}
              hasNextPage={hasNextPage}
              isLoading={isLoading}
              onPageSizeChange={handlePageSizeChange}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
