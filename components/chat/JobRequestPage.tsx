'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { JobParametersPanel } from '@/components/chat/JobParametersPanel';
import { useJobChat } from '@/hooks/useJobChat';
import { JobParameters } from '@/types/job';
import { coreRequestJson } from '@/lib/core/client';
import { HookApiError } from '@/lib/core/error-envelope';

type CompanyContextResponse = {
  data?: Array<{ id?: string }>;
};

type CreatedJobResponse = {
  data?: {
    id?: string;
  };
};

type CreateJobPayload = {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  salary: number;
  currency: 'GBP';
  companyId: string;
  tradeType?: string;
  workersNeeded?: number;
};

interface JobRequestPageProps {
  onSubmit?: (jobParams: JobParameters) => void;
}

export function JobRequestPage({ onSubmit }: JobRequestPageProps) {
  const {
    messages,
    jobParams,
    isTyping,
    inputValue,
    sendMessage,
    updateInputValue,
    isJobComplete,
  } = useJobChat();

  const [showAllocation, setShowAllocation] = useState(false);
  const [isPriceApproved, setIsPriceApproved] = useState(false);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const isComplete = isJobComplete();

  const getCompanyContextErrorMessage = (): string => {
    return 'Your recruiter account is missing a company association. Ask an admin to link your account to a company, then try creating the job again.';
  };

  const normalizeCreateError = (error: unknown): string => {
    if (error instanceof HookApiError) {
      if (error.envelope.status === 403) {
        return getCompanyContextErrorMessage();
      }

      return error.envelope.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to create job.';
  };

  const resolveCompanyId = async (): Promise<string> => {
    const payload = await coreRequestJson<CompanyContextResponse>('/api/core/companies', {
      method: 'GET',
      query: { limit: 1, offset: 0 },
      fallbackMessage: 'Failed to resolve company context for job creation.',
      fallbackCode: 'JOB_CREATE_COMPANY_CONTEXT_FAILED',
    });

    const companyId = payload?.data?.[0]?.id;
    if (!companyId) {
      throw new Error(getCompanyContextErrorMessage());
    }

    return companyId;
  };

  const toIsoString = (value: string | undefined): string | null => {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  };

  const deriveDateRange = (): { startAt: string; endAt: string } => {
    const parsedStart = toIsoString(jobParams.startDate);
    const startDate = parsedStart ? new Date(parsedStart) : new Date();
    const startAt = startDate.toISOString();

    const parsedEnd = toIsoString(jobParams.endDate);
    if (parsedEnd) {
      return { startAt, endAt: parsedEnd };
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    return { startAt, endAt: endDate.toISOString() };
  };

  const calculateBasicSalary = (): number => {
    const workers = jobParams.workersNeeded ?? 1;
    const labourCost = workers * 280;
    const platformFee = labourCost * 0.1;
    return labourCost + platformFee;
  };

  const buildCreatePayload = (companyId: string): CreateJobPayload => {
    const { startAt, endAt } = deriveDateRange();
    const salary = calculateBasicSalary();
    const tradeLabel = jobParams.tradeType ? jobParams.tradeType : 'General Trade';
    const locationLabel = jobParams.location ? jobParams.location : 'Site job';
    const description = jobParams.description?.trim();

    const payload: CreateJobPayload = {
      title: `${tradeLabel} - ${locationLabel}`,
      startAt,
      endAt,
      salary,
      currency: 'GBP',
      companyId,
    };

    if (jobParams.tradeType) {
      payload.tradeType = jobParams.tradeType;
    }

    if (jobParams.workersNeeded && Number.isInteger(jobParams.workersNeeded)) {
      payload.workersNeeded = jobParams.workersNeeded;
    }

    if (description && description.length > 0) {
      payload.description = description;
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!isComplete) {
      setSubmitError('Complete all required job details before approving and creating the job.');
      return;
    }

    if (!isPriceApproved) {
      setSubmitError('Please approve the quoted price before creating a job.');
      return;
    }

    setIsSubmittingJob(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const companyId = await resolveCompanyId();
      const payload = buildCreatePayload(companyId);

      const response = await coreRequestJson<CreatedJobResponse>('/api/core/jobs', {
        method: 'POST',
        fallbackMessage: 'Failed to create job.',
        fallbackCode: 'JOB_CREATE_FAILED',
        body: payload,
      });

      const createdId = response?.data?.id;
      setSubmitSuccess(createdId ? `Job created successfully (${createdId}).` : 'Job created successfully.');

      if (onSubmit) {
        onSubmit(jobParams);
      } else {
        setShowAllocation(true);
      }
    } catch (error) {
      setSubmitError(normalizeCreateError(error));
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // If showing allocation, render allocation component
  if (showAllocation) {
    // TODO: Import and render AllocationSidebar or redirect to allocation page
    return (
      <div className="p-8">
        <p className="text-lg">Allocation view - to be implemented</p>
        <Button onClick={() => setShowAllocation(false)} className="mt-4">
          Back to Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ChatInterface
              messages={messages}
              isTyping={isTyping}
              inputValue={inputValue}
              onInputChange={updateInputValue}
              onSendMessage={() => sendMessage(inputValue)}
            />
          </div>

          {/* Job Parameters Panel - Takes 1 column on large screens */}
          <div>
            <JobParametersPanel
              jobParams={jobParams}
              isComplete={isComplete}
              onSubmit={handleSubmit}
              isPriceApproved={isPriceApproved}
              onPriceApprovalChange={setIsPriceApproved}
              isSubmitting={isSubmittingJob}
            />
            {submitError ? <p className="mt-3 text-sm text-red-600">{submitError}</p> : null}
            {submitSuccess ? <p className="mt-3 text-sm text-emerald-700">{submitSuccess}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
