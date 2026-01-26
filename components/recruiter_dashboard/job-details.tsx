import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface JobDetailsProps {
  jobId: number;
  onBack: () => void;
}

export default function JobDetails({ jobId, onBack }: JobDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payments
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Job Details</h1>
        <p className="text-slate-600">View detailed information about this job</p>
      </div>

      {/* Job Details Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Job Title</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Job ID</label>
              <p className="mt-1 text-slate-900">#{jobId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Status</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Date Posted</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Start Date</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Completion Date</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Location</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Workers Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Workers</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Tradesperson Name</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Trade Type</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Contact</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Rating</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Hours Worked</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Cost Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cost</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Job Amount</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Platform Fee</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Amount Paid</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Outstanding Balance</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Payment Method</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Payment Status</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Payment Date</label>
              <p className="mt-1 text-slate-900">-</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
