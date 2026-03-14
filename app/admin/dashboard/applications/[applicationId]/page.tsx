"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationDecision } from "@/types/admin-applications";

export default function ApplicationReviewPage(): React.JSX.Element {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Array.isArray(params.applicationId)
    ? params.applicationId[0]
    : params.applicationId;

  const {
    getApplicationById,
    reviewApplication,
    isLoading,
    isMutating,
    error,
  } = useApplications();

  const application = useMemo(
    () => getApplicationById(applicationId),
    [applicationId, getApplicationById]
  );

  const [resolution, setResolution] = useState<ApplicationDecision | "">("");
  const [reason, setReason] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Application Not Found</h1>
          <p className="text-slate-600">
            The selected application could not be found.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const isRejecting = resolution === "rejected";

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!resolution || isMutating) return;
    if (reason.trim().length < 3) return;

    try {
      await reviewApplication({
        applicationId: application.id,
        resolution,
        reason,
      });
      setSaveMessage("Decision saved successfully.");
    } catch {
      setSaveMessage("Unable to save decision. Please retry.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Application Review</h1>
            <p className="text-slate-600">
              Full-page review for large forms, documents, and admin notes.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Back to Applications
          </Link>
        </div>

        <Card className="border border-slate-200 p-6">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <p className="text-slate-700"><strong>ID:</strong> {application.id}</p>
            <p className="text-slate-700"><strong>Applicant:</strong> {application.applicantName}</p>
            <p className="text-slate-700"><strong>Type:</strong> {application.type}</p>
            <p className="text-slate-700"><strong>Submitted:</strong> {application.submittedAt}</p>
            <p className="text-slate-700"><strong>Current Status:</strong> {application.status}</p>
          </div>
        </Card>

        <Card className="border border-slate-200 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Submitted Survey Details</h2>

          {isLoading ? (
            <p className="text-sm text-slate-700">Loading details...</p>
          ) : application.type === "recruiter" && application.recruiterDetails ? (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <p className="text-slate-700"><strong>Company Name:</strong> {application.recruiterDetails.companyName}</p>
              <p className="text-slate-700"><strong>Requester:</strong> {application.recruiterDetails.requesterFullName}</p>
              <p className="text-slate-700"><strong>Requester Email:</strong> {application.recruiterDetails.requesterEmail}</p>
              <p className="text-slate-700"><strong>Requester Phone:</strong> {application.recruiterDetails.requesterPhone}</p>
              <p className="text-slate-700"><strong>Role Title:</strong> {application.recruiterDetails.requesterRoleTitle}</p>
              <p className="text-slate-700 md:col-span-2"><strong>Address:</strong> {application.recruiterDetails.officeAddressLine1} {application.recruiterDetails.officeAddressLine2}, {application.recruiterDetails.officeCity}, {application.recruiterDetails.officePostcode}</p>
              <p className="text-slate-700"><strong>Website:</strong> {application.recruiterDetails.companyWebsite || "Not provided"}</p>
              <p className="text-slate-700"><strong>Requested Seats:</strong> {application.recruiterDetails.requestedSeatCount}</p>
              <p className="text-slate-700"><strong>Has Internal Approver:</strong> {application.recruiterDetails.hasInternalApprover ? "Yes" : "No"}</p>
              {application.recruiterDetails.hasInternalApprover && (
                <p className="text-slate-700 md:col-span-2"><strong>Internal Approver:</strong> {application.recruiterDetails.internalApproverFullName} ({application.recruiterDetails.internalApproverEmail})</p>
              )}
              <p className="text-slate-700"><strong>Contract Signer Same as Requester:</strong> {application.recruiterDetails.contractSignerSameAsRequester ? "Yes" : "No"}</p>
              {!application.recruiterDetails.contractSignerSameAsRequester && (
                <p className="text-slate-700 md:col-span-2"><strong>Contract Signer:</strong> {application.recruiterDetails.contractSignerFullName} ({application.recruiterDetails.contractSignerEmail})</p>
              )}
            </div>
          ) : null}

          {application.type === "trade" && application.tradeDetails && (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <p className="text-slate-700"><strong>Name:</strong> {application.tradeDetails.name}</p>
              <p className="text-slate-700"><strong>Occupation:</strong> {application.tradeDetails.occupation}</p>
              <p className="text-slate-700 md:col-span-2"><strong>Address:</strong> {application.tradeDetails.address}</p>
              <p className="text-slate-700 md:col-span-2"><strong>References:</strong> {application.tradeDetails.references}</p>
              <p className="text-slate-700"><strong>Qualification File:</strong> {application.tradeDetails.qualificationsFileName || "Not provided"}</p>
              <p className="text-slate-700"><strong>Photos Uploaded:</strong> {application.tradeDetails.photosCount}</p>
            </div>
          )}
        </Card>

        <Card className="border border-slate-200 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Documents & Evidence</h2>
          <div className="space-y-3 text-sm text-slate-700">
            {application.type === "trade" ? (
              <>
                <p><strong>Qualifications:</strong> {application.tradeDetails?.qualificationsFileName || "No file uploaded"}</p>
                <p><strong>Work Photos:</strong> {application.tradeDetails?.photosCount ?? 0} files uploaded</p>
              </>
            ) : (
              <>
                <p><strong>Company Registration:</strong> Provided in submitted company details.</p>
                <p><strong>Contact Verification:</strong> Review contact email and phone in profile details above.</p>
              </>
            )}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Document viewer placeholder: backend file URLs can be connected here later.
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Decision</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="resolution"
                  value="approved"
                  checked={resolution === "approved"}
                  onChange={(e) => setResolution(e.target.value as ApplicationDecision)}
                />
                Approve application
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="resolution"
                  value="rejected"
                  checked={resolution === "rejected"}
                  onChange={(e) => setResolution(e.target.value as ApplicationDecision)}
                />
                Disapprove application
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason {isRejecting ? "*" : "(optional)"}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                required
                placeholder={
                  isRejecting
                    ? "Provide reason for disapproval"
                    : "Optional note for approval"
                }
                className="block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {saveMessage && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {saveMessage}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-black text-white hover:bg-gray-900"
                disabled={isMutating || !resolution || reason.trim().length < 3}
              >
                {isMutating ? "Saving..." : "Save Decision"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
