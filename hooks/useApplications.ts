import { useCallback, useEffect, useState } from "react";
import {
  ApplicationStatus,
  RegistrationApplication,
  ApplicationReviewData,
  RecruiterRegistrationApiRecord,
} from "@/types/admin-applications";
import { captureFrontendError, captureFrontendMessage } from "@/lib/monitoring/sentry";
import {
  HookErrorEnvelope,
  parseJsonOrThrowEnvelope,
  toHookApiError,
} from "@/lib/core/error-envelope";

const APPLICATIONS_CACHE_TTL_MS = 60_000;
let applicationsCache: { data: RegistrationApplication[]; updatedAt: number } | null = null;
let applicationsInflight: Promise<RegistrationApplication[]> | null = null;
const ENABLE_APPLICATIONS_CACHE = process.env.NODE_ENV !== "test";

// TODO(identity-service): Keep this flow aligned with Identity service contracts
// for admin registration review endpoints.

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

  return parseJsonOrThrowEnvelope<T>(
    response,
    "Application request failed.",
    "APPLICATIONS_API_ERROR",
  );
}

export const useApplications = () => {
  const [applications, setApplications] = useState<RegistrationApplication[]>(applicationsCache?.data ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  const loadApplications = useCallback(async () => {
    if (
      ENABLE_APPLICATIONS_CACHE &&
      applicationsCache &&
      Date.now() - applicationsCache.updatedAt < APPLICATIONS_CACHE_TTL_MS
    ) {
      setApplications(applicationsCache.data);
      setError(null);
      setErrorEnvelope(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorEnvelope(null);
    try {
      if (!applicationsInflight || !ENABLE_APPLICATIONS_CACHE) {
        applicationsInflight = (async () => {
          const result = await requestApplications<{ items: RecruiterRegistrationApiRecord[] }>(
            "/api/auth/admin/registration-requests?limit=100&offset=0",
            { method: "GET" },
          );
          return (result.items ?? []).map(mapRecruiterRecord);
        })();
      }

      const mapped = await applicationsInflight;
      if (ENABLE_APPLICATIONS_CACHE) {
        applicationsCache = { data: mapped, updatedAt: Date.now() };
      }
      setApplications(mapped);
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        "Unable to load applications right now.",
        "APPLICATIONS_LOAD_FAILED",
      );
      captureFrontendError(apiError, {
        flow: "admin_registration_review",
        endpoint: "/api/auth/admin/registration-requests",
        action: "list",
        role: "admin",
      });
      captureFrontendMessage("Admin applications request failed", {
        flow: "admin_registration_review",
        endpoint: "/api/auth/admin/registration-requests",
        action: "list",
        role: "admin",
        extra: {
          code: apiError.envelope.code,
          requestId: apiError.envelope.requestId,
          status: apiError.envelope.status,
        },
      });
      setError("Unable to load applications right now.");
      setErrorEnvelope(apiError.envelope);
    } finally {
      if (ENABLE_APPLICATIONS_CACHE) {
        applicationsInflight = null;
      }
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
      const updated = [mapped, ...next];
      if (ENABLE_APPLICATIONS_CACHE) {
        applicationsCache = { data: updated, updatedAt: Date.now() };
      }
      return updated;
    });
  }, []);

  const reviewApplication = async ({
    applicationId,
    resolution,
    reason,
  }: ApplicationReviewData): Promise<void> => {
    setIsMutating(true);
    setError(null);
    setErrorEnvelope(null);
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
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        "Unable to save your decision right now.",
        "APPLICATION_DECISION_FAILED",
      );
      captureFrontendMessage("Admin decision request failed", {
        flow: "admin_registration_review",
        endpoint: `/api/auth/admin/registration-requests/${applicationId}/decision`,
        action: "decision",
        role: "admin",
        extra: {
          code: apiError.envelope.code,
          requestId: apiError.envelope.requestId,
          status: apiError.envelope.status,
        },
      });
      captureFrontendError(apiError, {
        flow: "admin_registration_review",
        endpoint: `/api/auth/admin/registration-requests/${applicationId}/decision`,
        action: "decision",
        role: "admin",
      });
      setError("Unable to save your decision right now.");
      setErrorEnvelope(apiError.envelope);
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
    errorEnvelope,
    reloadApplications: loadApplications,
    getApplicationsCount,
    getFilteredApplications,
    getApplicationsByType,
    getApplicationById,
    reviewApplication,
  };
};
