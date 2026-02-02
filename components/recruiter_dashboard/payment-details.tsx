"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Shield,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useCompanyPaymentDetails } from "@/hooks/useCompanyPaymentDetails";
import type { CompanyPaymentStatus } from "@/types/company-payments";

const statusConfig: Record<
  CompanyPaymentStatus,
  { label: string; color: string; icon: typeof Clock; description: string }
> = {
  unpaid: {
    label: "Unpaid",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: AlertTriangle,
    description: "Payment required to proceed with job",
  },
  "platform-fee-paid": {
    label: "Platform Fee Paid",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
    description: "Platform fee paid. Labour payment pending.",
  },
  escrowed: {
    label: "Payment Secured",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Shield,
    description: "Labour cost held securely by Stripe",
  },
  released: {
    label: "Payment Released",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
    description: "Payment has been released to workers",
  },
  refunded: {
    label: "Refunded",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CheckCircle2,
    description: "Payment has been refunded",
  },
};

interface PaymentDetailsProps {
  paymentId: string;
  onBack: () => void;
  onViewJob?: (jobId: string) => void;
  onContactSupport?: () => void;
}

export default function PaymentDetails({
  paymentId,
  onBack,
  onViewJob,
  onContactSupport,
}: PaymentDetailsProps) {
  // Load payment detail data
  const { payment, isLoading, error } = useCompanyPaymentDetails(paymentId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <CardContent className="text-slate-600">Loading payment details...</CardContent>
      </Card>
    );
  }

  if (error || !payment) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl text-slate-900 mb-2">Payment Not Found</h2>
          <p className="text-slate-600 mb-4">The payment you're looking for doesn't exist.</p>
          <Button onClick={onBack}>Back to Payments</Button>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;
  const formatCurrency = (value: number) =>
    value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB");
  const formatDateTime = (value: string) => new Date(value).toLocaleString("en-GB");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <Button variant="ghost" className="mb-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payments
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl text-slate-900 mb-2">Payment Details</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${config.color} border`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-sm text-slate-600">Payment ID: {payment.id}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onViewJob?.(payment.jobId)}>
              <FileText className="h-4 w-4 mr-2" />
              View Job
            </Button>
          </div>
        </div>

        {payment.status === "escrowed" && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <p className="text-blue-900 text-sm">
              <strong>Stripe Hold:</strong> Your payment of £{formatCurrency(
                payment.totalAmount
              )} is held securely by Stripe. Funds will be automatically released
              to workers once the job is marked as complete.
            </p>
          </div>
        )}

        {payment.pendingEscrow && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Clock className="h-5 w-5 text-amber-600" />
            <p className="text-amber-900 text-sm">
              <strong>Pending Payment:</strong> Labour cost of £{formatCurrency(
                payment.pendingEscrow.amount
              )} will be charged on {formatDate(payment.pendingEscrow.scheduledDate)}. {" "}
              {payment.pendingEscrow.description}
            </p>
          </div>
        )}

        {payment.status === "released" && payment.releasedAt && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-900 text-sm">
              <strong>Payment Complete:</strong> The payment of £{formatCurrency(
                payment.totalAmount
              )} was released to workers on {formatDate(payment.releasedAt)}.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Job</span>
                  <button
                    onClick={() => onViewJob?.(payment.jobId)}
                    className="text-blue-600 hover:underline"
                  >
                    {payment.jobTitle}
                  </button>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg">
                  <span className="text-slate-900">Total Paid</span>
                  <span className="text-slate-900">£{formatCurrency(payment.totalAmount)}</span>
                </div>
                <Separator />
                <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-900">
                      {payment.paymentMethod ?? "Not available"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payment.transactions.map((txn, index) => {
                  const txnStatusConfig = {
                    completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
                    escrowed: { icon: Shield, color: "text-blue-600", bg: "bg-blue-100" },
                    pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
                  } as const;
                  const txnConfig = txnStatusConfig[txn.status];
                  const TxnIcon = txnConfig.icon;

                  return (
                    <div key={txn.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${txnConfig.bg}`}>
                          <TxnIcon className={`h-4 w-4 ${txnConfig.color}`} />
                        </div>
                        {index < payment.transactions.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 flex-1 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-900">{txn.description}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(txn.date)}</p>
                          </div>
                          <span className="text-sm text-slate-900">£{formatCurrency(txn.amount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  How Stripe Hold Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    1
                  </div>
                  <p>
                    <strong>Payment held by Stripe:</strong> Your payment is charged but held securely by Stripe (not released to workers yet).
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    2
                  </div>
                  <p>
                    <strong>Job completion:</strong> Once you mark the job as complete, the held
                    funds are automatically released to the workers.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    3
                  </div>
                  <p>
                    <strong>Cancellation:</strong> If the job is cancelled, the held payment is refunded to your account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg ${config.color
                      .replace("text-", "bg-")
                      .replace("-700", "-100")} flex items-center justify-center`}
                  >
                    <StatusIcon className={`h-5 w-5 ${config.color.split(" ")[1]}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">{config.label}</p>
                    <p className="text-xs text-slate-600 mt-1">{config.description}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Created</span>
                    <span className="text-slate-900">{formatDate(payment.createdAt)}</span>
                  </div>
                  {payment.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paid</span>
                      <span className="text-slate-900">{formatDate(payment.paidAt)}</span>
                    </div>
                  )}
                  {payment.releasedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Released</span>
                      <span className="text-slate-900">{formatDate(payment.releasedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onViewJob?.(payment.jobId)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Related Job
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Payment Method
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-slate-50">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-slate-600">
                  If you have any questions about this payment or need assistance, our support
                  team is here to help.
                </p>
                <Button variant="outline" className="w-full" onClick={onContactSupport}>
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
