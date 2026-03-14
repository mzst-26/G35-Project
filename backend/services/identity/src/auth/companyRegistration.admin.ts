import crypto from "node:crypto";
import { z } from "zod";
import { createServiceRoleClient } from "../supabase/index.js";
import { ConflictError, InternalAuthError, ValidationError } from "../errors/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { addSentryBreadcrumb, captureSentryBusinessFailure } from "../observability/sentry.js";
import {
  type RecruiterRegistrationListFilters,
  type RegistrationDecisionInput,
  type RecruiterRegistrationRecord,
  type RegistrationStatus,
  RegistrationRowSchema,
  mapRegistrationRow,
  ensureRecruiterUser,
  ensureCompanyForUser,
} from "./companyRegistration.helpers.js";

export async function listRecruiterRegistrationRequests(
  filters: RecruiterRegistrationListFilters,
): Promise<{ items: RecruiterRegistrationRecord[]; total: number }> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("company_registration_requests")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new InternalAuthError(new Error(error.message));
  }

  const parsed = z.array(RegistrationRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new InternalAuthError(parsed.error);
  }

  return {
    items: parsed.data.map(mapRegistrationRow),
    total: count ?? parsed.data.length,
  };
}

export async function getRecruiterRegistrationRequest(
  requestId: string,
): Promise<RecruiterRegistrationRecord | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("company_registration_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new InternalAuthError(new Error(error.message));
  }
  if (!data) return null;

  const parsed = RegistrationRowSchema.safeParse(data);
  if (!parsed.success) {
    throw new InternalAuthError(parsed.error);
  }
  return mapRegistrationRow(parsed.data);
}

export async function decideRecruiterRegistration(
  input: RegistrationDecisionInput,
): Promise<RecruiterRegistrationRecord> {
  const existing = await getRecruiterRegistrationRequest(input.requestId);
  if (!existing) {
    throw new ValidationError("Registration request not found.", [{ field: "requestId", message: "Unknown request id." }]);
  }

  if (existing.status !== "pending") {
    captureSentryBusinessFailure("registration decision attempted on non-pending request", {
      flow: "registration_review",
      endpoint: "/api/auth/admin/registration-requests/:id/decision",
      decision: input.decision,
      role: "admin",
      account_status: existing.status,
    }, {
      requestId: existing.id,
      status: existing.status,
    });
    throw new ConflictError("This registration request has already been reviewed.");
  }

  const reason = input.reason.trim();
  if (input.decision === "reject" && reason.length === 0) {
    throw new ValidationError("Reason is required when rejecting a request.", [
      { field: "reason", message: "Reason is required for rejection." },
    ]);
  }

  const reviewReason = reason.length > 0
    ? reason
    : input.decision === "approve"
      ? "Approved by admin review"
      : "Rejected by admin review";

  let approvedUserId: string | null = null;
  let approvedCompanyId: string | null = null;

  if (input.decision === "approve") {
    approvedUserId = await ensureRecruiterUser(
      existing.requesterEmail,
      existing.requesterFullName,
      existing.requesterPhone,
    );

    approvedCompanyId = await ensureCompanyForUser(
      approvedUserId,
      existing,
      input.adminUserId,
      reviewReason,
    );
  }

  const status: RegistrationStatus = input.decision === "approve" ? "approved" : "rejected";
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("company_registration_requests")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by_admin_user_id: input.adminUserId,
      review_reason: reviewReason,
      approved_user_id: approvedUserId,
      approved_company_id: approvedCompanyId,
    })
    .eq("id", input.requestId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new InternalAuthError(new Error(error.message));
  }

  if (!data) {
    throw new ConflictError("This registration request has already been reviewed.");
  }

  const parsed = RegistrationRowSchema.safeParse(data);
  if (!parsed.success) {
    throw new InternalAuthError(parsed.error);
  }

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: input.requestId,
    occurredAt: new Date().toISOString(),
    event: "auth.account.registration_request_reviewed",
    userId: input.adminUserId,
    role: "admin",
    detail: status,
  });

  addSentryBreadcrumb({
    category: "registration",
    message: "registration request reviewed",
    level: "info",
    data: {
      flow: "registration_review",
      endpoint: "/api/auth/admin/registration-requests/:id/decision",
      decision: input.decision,
      role: "admin",
      account_status: status,
      requestId: input.requestId,
      reviewerId: input.adminUserId,
    },
  });

  return mapRegistrationRow(parsed.data);
}
