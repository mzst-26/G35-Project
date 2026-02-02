import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Shield,
  Clock,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useCompanyPayments } from "@/hooks/useCompanyPayments";
import type { CompanyPaymentListItem, CompanyPaymentStatus } from "@/types/company-payments";

interface PaymentsProps {
  onViewJob?: (jobId: string) => void;
  onViewPayment?: (paymentId: string) => void;
}

export default function Payments({ onViewJob, onViewPayment }: PaymentsProps) {
  // Load payments from the service hook
  const { payments, summary, isLoading, error } = useCompanyPayments();

  const statusConfig: Record<CompanyPaymentStatus, { label: string; color: string; icon: typeof Clock }> = {
    unpaid: { label: "Unpaid", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
    "platform-fee-paid": {
      label: "Platform Fee Paid",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    },
    escrowed: { label: "Payment Secured", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Shield },
    released: { label: "Payment Released", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
    refunded: { label: "Refunded", color: "bg-slate-100 text-slate-700 border-slate-200", icon: CheckCircle2 },
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-600">Manage your payments and track job expenses</p>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Paid */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-slate-900">
                £{summary.totalPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Total in Stripe */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total in Stripe</p>
              <p className="text-2xl font-bold text-slate-900">
                £{summary.totalInEscrow.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Unpaid Jobs */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Unpaid Jobs</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary.unpaidJobs}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {isLoading && <p className="text-slate-600">Loading payments...</p>}

        {error && !isLoading && <p className="text-red-600">{error}</p>}

        {!isLoading && !error && payments.length === 0 && (
          <Card className="p-6">
            <CardContent className="text-center">
              <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No payments available</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && payments.length > 0 && (
          <div className="space-y-4">
            {payments.map((payment: CompanyPaymentListItem) => {
              const config = statusConfig[payment.status];
              const StatusIcon = config.icon;

              return (
                <Card key={payment.id} className="shadow-sm border-slate-200">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg text-slate-900">{payment.jobTitle}</h3>
                          <Badge className={`${config.color} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span>Invoice: {payment.invoice}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{payment.date}</span>
                          </div>
                          {payment.paymentMethod && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 flex-shrink-0" />
                              <span>{payment.paymentMethod}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-slate-600">Labour: £{formatCurrency(payment.labourCost)}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">Platform Fee: £{formatCurrency(payment.platformFee)}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-900">Total: £{formatCurrency(payment.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => onViewPayment?.(payment.id)}
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onViewJob?.(payment.jobId)}
                        >
                          View Job
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
