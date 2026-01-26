import { Card } from "@/components/ui/card";
import { DollarSign, Clock, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { PaymentSummary, JobHistory, JobStatus } from "@/types/payment";

interface PaymentsProps {
  paymentSummary?: PaymentSummary;
  jobHistory?: JobHistory[];
}

export default function Payments({ paymentSummary, jobHistory }: PaymentsProps) {
  // Default mock data if not provided
  const defaultPaymentSummary: PaymentSummary = {
    totalPaid: 45750.00,
    totalInEscrow: 12500.00,
    platformFeesPaid: 3215.50,
    unpaidJobs: 3
  };

  const defaultJobHistory: JobHistory[] = [
    {
      id: 1,
      jobTitle: "Plumbing Installation - Office Building",
      tradesperson: "John Smith",
      amount: 2500.00,
      outstanding: 0,
      status: "completed",
      date: "2026-01-20"
    },
    {
      id: 2,
      jobTitle: "Electrical Wiring - Residential",
      tradesperson: "Sarah Johnson",
      amount: 3200.00,
      outstanding: 0,
      status: "completed",
      date: "2026-01-18"
    },
    {
      id: 3,
      jobTitle: "HVAC Maintenance",
      tradesperson: "Mike Wilson",
      amount: 1800.00,
      outstanding: 1800.00,
      status: "overdue",
      date: "2026-01-15"
    },
    {
      id: 4,
      jobTitle: "Carpentry Work - Kitchen Renovation",
      tradesperson: "Emily Brown",
      amount: 4500.00,
      outstanding: 0,
      status: "completed",
      date: "2026-01-10"
    },
    {
      id: 5,
      jobTitle: "Painting - Commercial Space",
      tradesperson: "David Lee",
      amount: 2100.00,
      outstanding: 2100.00,
      status: "upcoming",
      date: "2026-01-28"
    }
  ];

  const summary = paymentSummary || defaultPaymentSummary;
  const history = jobHistory || defaultJobHistory;

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      case 'upcoming':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'upcoming':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-600">Manage your payments and track job expenses</p>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Total in Escrow */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total in Escrow</p>
              <p className="text-2xl font-bold text-slate-900">
                £{summary.totalInEscrow.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Platform Fees Paid */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Platform Fees Paid</p>
              <p className="text-2xl font-bold text-slate-900">
                £{summary.platformFeesPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-600" />
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

      {/* Job History Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Completed Job History</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Job Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tradesperson</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Amount Paid</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Outstanding</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-slate-900">{job.jobTitle}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-slate-600">{job.tradesperson}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-slate-600">{job.date}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="text-sm font-medium text-slate-900">
                      £{job.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className={`text-sm font-medium ${job.outstanding > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      £{job.outstanding.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State (if no jobs) */}
        {history.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No job history available</p>
          </div>
        )}
      </Card>
    </div>
  );
}
