import { useCallback, useEffect, useState } from "react";
import {
  ApplicationStatus,
  RegistrationApplication,
  ApplicationReviewData,
  RecruiterRegistrationApiRecord,
} from "@/types/admin-applications";
import { captureFrontendError, captureFrontendMessage } from "@/lib/monitoring/sentry";

class ApplicationsApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApplicationsApiError";
    this.code = code;
    this.status = status;
  }
}

function mapRecruiterRecord(record: RecruiterRegistrationApiRecord): RegistrationApplication {
  return {
    id: record.id,
    applicantName: record.companyName,
    type: "recruiter",
    submittedAt: record.submittedAt,
    updatedAt: record.updatedAt,
    status: record.status === "withdrawn" ? "rejected" : record.status,
    adminReason: record.reviewReason ?? undefined,
    reviewedAt: record.reviewedAt,
    reviewedByAdminUserId: record.reviewedByAdminUserId,
    recruiterDetails: {
      companyName: record.companyName,
      requesterFullName: record.requesterFullName,
      requesterEmail: record.requesterEmail,
      requesterPhone: record.requesterPhone,
      requesterRoleTitle: record.requesterRoleTitle,
      officeAddressLine1: record.officeAddressLine1,
      officeAddressLine2: record.officeAddressLine2,
      officeCity: record.officeCity,
      officePostcode: record.officePostcode,
      companyWebsite: record.companyWebsite,
      requestedSeatCount: record.requestedSeatCount,
      hasInternalApprover: record.hasInternalApprover,
      internalApproverFullName: record.internalApproverFullName,
      internalApproverEmail: record.internalApproverEmail,
      contractSignerSameAsRequester: record.contractSignerSameAsRequester,
      contractSignerFullName: record.contractSignerFullName,
      contractSignerEmail: record.contractSignerEmail,
    },
  };
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return (await response.json()) as T;
}

async function requestApplications<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const body = await parseJson<{ code?: string; message?: string } & T>(response);

  if (!response.ok) {
    throw new ApplicationsApiError(
      body?.message ?? "Application request failed.",
      body?.code ?? "APPLICATIONS_API_ERROR",
      response.status,
    );
  }

  return (body ?? ({} as T)) as T;
}

export const useApplications = () => {
  const [applications, setApplications] = useState<RegistrationApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await requestApplications<{ items: RecruiterRegistrationApiRecord[] }>(
        "/api/auth/admin/registration-requests?limit=100&offset=0",
        { method: "GET" },
      );

      setApplications((result.items ?? []).map(mapRecruiterRecord));
    } catch (error) {
      captureFrontendError(error, {
        flow: "admin_registration_review",
        endpoint: "/api/auth/admin/registration-requests",
        action: "list",
        role: "admin",
      });
      setError("Unable to load applications right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const getApplicationsCount = (status: ApplicationStatus): number => {
    return applications.filter((application) => application.status === status)
      .length;
  };

  const getFilteredApplications = (
    status: ApplicationStatus
  ): RegistrationApplication[] => {
    return applications.filter((application) => application.status === status);
  };

  const getApplicationsByType = (
    type: RegistrationApplication["type"]
  ): RegistrationApplication[] => {
    return applications.filter((application) => application.type === type);
  };

  const getApplicationById = (
    applicationId: string
  ): RegistrationApplication | undefined => {
    return applications.find((application) => application.id === applicationId);
  };

  const refreshApplication = useCallback(async (applicationId: string): Promise<void> => {
    const result = await requestApplications<RecruiterRegistrationApiRecord>(
      `/api/auth/admin/registration-requests/${applicationId}`,
      { method: "GET" },
    );

    setApplications((current) => {
      const mapped = mapRecruiterRecord(result);
      const next = current.filter((app) => app.id !== applicationId);
      return [mapped, ...next];
    });
  }, []);

  const reviewApplication = async ({
    applicationId,
    resolution,
    reason,
  }: ApplicationReviewData): Promise<void> => {
    setIsMutating(true);
    setError(null);
    try {
      await requestApplications<RecruiterRegistrationApiRecord>(
        `/api/auth/admin/registration-requests/${applicationId}/decision`,
        {
          method: "POST",
          body: JSON.stringify({
            decision: resolution === "approved" ? "approve" : "reject",
            reason: reason.trim(),
          }),
          headers: {
            "x-csrf-token": document.cookie
              .split(";")
              .map((cookie) => cookie.trim())
              .find((cookie) => cookie.startsWith("csrf-token="))
              ?.split("=")[1] ?? "",
          },
        },
      );
      await refreshApplication(applicationId);
    } catch (error) {
      captureFrontendMessage("Admin decision request failed", {
        flow: "admin_registration_review",
        endpoint: `/api/auth/admin/registration-requests/${applicationId}/decision`,
        action: "decision",
        role: "admin",
      });
      captureFrontendError(error, {
        flow: "admin_registration_review",
        endpoint: `/api/auth/admin/registration-requests/${applicationId}/decision`,
        action: "decision",
        role: "admin",
      });
      setError("Unable to save your decision right now.");
      throw new Error("APPLICATION_DECISION_FAILED");
    } finally {
      setIsMutating(false);
    }
  };

  const pendingApplications = getFilteredApplications("pending");

  return {
    applications,
    pendingApplications,
    isLoading,
    isMutating,
    error,
    reloadApplications: loadApplications,
    getApplicationsCount,
    getFilteredApplications,
    getApplicationsByType,
    getApplicationById,
    reviewApplication,
  };
};
