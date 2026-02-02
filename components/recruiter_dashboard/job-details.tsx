"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  PoundSterling,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  XCircle,
  CreditCard,
} from "lucide-react";
import { useCompanyJobDetails } from "@/hooks/useCompanyJobDetails";

interface JobDetailsProps {
  jobId: string;
  onBack: () => void;
  // Lets the parent control the back button text
  backLabel?: string;
  // Optional handler to open payment details
  onViewPayment?: (paymentId: string) => void;
}

export default function JobDetails({
  jobId,
  onBack,
  backLabel = "Back",
  onViewPayment,
}: JobDetailsProps) {
  // Load job detail data from the hook
  const { job, isLoading, error } = useCompanyJobDetails(jobId);
  // Dialog state for cancel/complete actions
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Status config for badges
  const statusConfig = {
    pending: {
      label: 'Pending Allocation',
      icon: Clock,
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Waiting for trade professionals to be allocated',
    },
    allocated: {
      label: 'Allocated',
      icon: CheckCircle2,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      description: 'Workers have been allocated and accepted',
    },
    'in-progress': {
      label: 'In Progress',
      icon: Clock,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Job is currently underway',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-700 border-green-100',
      description: 'Job has been completed and payment released',
    },
    cancelled: {
      label: 'Cancelled',
      icon: XCircle,
      color: 'bg-red-50 text-red-700 border-red-100',
      description: 'Job was cancelled',
    },
  } as const;

  if (isLoading) {
    return (
      <Card className="p-6">
        <CardContent className="text-slate-600">Loading job details...</CardContent>
      </Card>
    );
  }

  if (error || !job) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-4">The job you're looking for doesn't exist.</p>
          <Button onClick={onBack}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[job.status];
  const StatusIcon = config.icon;
  const canCancel = job.status === 'pending' || job.status === 'allocated';
  const canComplete = job.status === 'in-progress';
  const isCompleted = job.status === 'completed';

  const handleCancel = () => {
    if (cancelReason.trim()) {
      // In a real app, this would call the API
      setShowCancelDialog(false);
      onBack();
    }
  };

  const handleComplete = () => {
    // In a real app, this would call the API
    setShowCompleteDialog(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backLabel}
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl text-slate-900 mb-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${config.color} border`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="text-sm text-slate-600">Job ID: #{job.id}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.paymentId && (
                <Button
                  variant="outline"
                  onClick={() => onViewPayment?.(job.paymentId as string)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Payment
                </Button>
              )}
              {canComplete && (
                <Button
                  onClick={() => setShowCompleteDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Job
                </Button>
              )}
            </div>
          </div>
          <p className="text-slate-600">{config.description}</p>
        </div>

        {/* Payment Status Alerts */}
        {job.paymentStatus === 'stripe-hold' && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <PoundSterling className="h-5 w-5 text-blue-600" />
            <p className="text-blue-900 text-sm">
              <strong>Payment Secured:</strong> £{job.labourCost} is held by Stripe and will be
              released to workers once the job is completed and approved. Platform fee of £
              {job.platformFee} has been paid.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-900 text-sm">
              <strong>Job Completed:</strong> Payment of £{job.labourCost} has been released to
              workers. Completed on {new Date(job.completedAt!).toLocaleDateString()}.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Location</p>
                      <p className="text-slate-900">{job.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Duration</p>
                      <p className="text-slate-900">
                        {job.startDate} to {job.endDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Workers</p>
                      <p className="text-slate-900">
                        {job.workersNeeded} {job.trade}(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <PoundSterling className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Daily Rate</p>
                      <p className="text-slate-900">£{job.dailyRate}/day per worker</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-slate-500 mb-2">Description</p>
                  <p className="text-slate-900">{job.description}</p>
                </div>

                {job.requirements.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Requirements</p>
                      <ul className="space-y-1">
                        {job.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-slate-900">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Allocated Workers */}
            {job.allocatedWorkers.length > 0 && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle>Allocated Workers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {job.allocatedWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          {worker.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="text-slate-900">{worker.name}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>⭐ {worker.rating}</span>
                            <span>•</span>
                            <span>{worker.jobsCompleted} jobs</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${worker.phone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${worker.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Labour Cost</span>
                  <span>£{job.labourCost}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Platform Fee (10%)</span>
                  <span>£{job.platformFee}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-slate-900">
                  <span>Total</span>
                  <span>£{job.totalCost}</span>
                </div>

                {job.paymentStatus === 'platform-fee-paid' && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Platform fee paid. Labour payment will be processed before job start.
                  </div>
                )}
                {job.paymentStatus === 'Stripeed' && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                    Labour cost held in Stripe. Will be released upon completion.
                  </div>
                )}
                {job.paymentStatus === 'released' && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-900">
                    Payment has been released to workers.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {job.timeline.map((item, index) => (
                    <div key={`${item.event}-${index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            item.status === 'completed' ? 'bg-green-100' : 'bg-slate-100'
                          }`}
                        >
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        {index < job.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 flex-1 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm text-slate-900">{item.event}</p>
                        <p className="text-xs text-slate-500">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Cancel Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to cancel this job? This action cannot be undone.
                {job.paymentStatus === 'Stripeed' && (
                  <span className="block mt-2 text-blue-600">
                    The Stripeed amount (£{job.labourCost}) will be refunded to your account.
                    Platform fee (£{job.platformFee}) is non-refundable.
                  </span>
                )}
              </p>
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Reason for cancellation</label>
                <textarea
                  placeholder="Please provide a reason..."
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                  Keep Job
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={!cancelReason.trim()}
                >
                  Cancel Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Mark Job as Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                By marking this job as complete, you confirm that all work has been
                satisfactorily finished. The Stripeed payment of £{job.labourCost} will be
                released to the workers.
              </p>
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                <p className="text-xs text-blue-900">
                  <strong>Important:</strong> Once released, payments cannot be reversed. If
                  there are any issues with the work, please contact support before marking as
                  complete.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                  Confirm & Release Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
