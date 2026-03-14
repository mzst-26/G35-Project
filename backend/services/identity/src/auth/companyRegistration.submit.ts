import crypto from "node:crypto";
import { createServiceRoleClient } from "../supabase/index.js";
import { ConflictError, InternalAuthError } from "../errors/index.js";
import { authLogger } from "../observability/logger.js";
import { emitSecurityEvent } from "../observability/events.js";
import { addSentryBreadcrumb } from "../observability/sentry.js";
import {
  type RecruiterRegistrationSubmitInput,
  type RegistrationStatus,
  type AccountStatus,
  CompanyStatusRowSchema,
  normalizeName,
  normalizeEmail,
  normalizePhone,
  normalizeSpaces,
  normalizeAddress,
  normalizePostcode,
  normalizeWebsite,
  toNullableTrimmed,
  toIpv4Subnet,
  hashUserAgent,
} from "./companyRegistration.helpers.js";

export async function submitRecruiterRegistration(
  input: RecruiterRegistrationSubmitInput,
  context: { requestId: string; ipAddress?: string; userAgent?: string },
): Promise<{ requestId: string; status: RegistrationStatus; deduplicated: boolean }> {
  const supabase = createServiceRoleClient();

  const normalised = {
    requesterFullName: normalizeName(input.requesterFullName),
    requesterEmail: normalizeEmail(input.requesterEmail),
    requesterPhone: normalizePhone(input.requesterPhone),
    requesterRoleTitle: normalizeSpaces(input.requesterRoleTitle),
    isUkRegistered: input.isUkRegistered,
    companyName: normalizeSpaces(input.companyName),
    companyOriginCountry: toNullableTrimmed(input.companyOriginCountry),
    ukCompanyNumber: toNullableTrimmed(input.ukCompanyNumber),
    officeAddressLine1: normalizeAddress(input.officeAddressLine1),
    officeAddressLine2: toNullableTrimmed(input.officeAddressLine2),
    officeCity: normalizeAddress(input.officeCity),
    officePostcode: normalizePostcode(input.officePostcode),
    companyWebsite: normalizeWebsite(input.companyWebsite),
    requestedSeatCount: input.requestedSeatCount,
    hasInternalApprover: input.hasInternalApprover,
    internalApproverFullName: toNullableTrimmed(input.internalApproverFullName),
    internalApproverEmail: input.internalApproverEmail ? normalizeEmail(input.internalApproverEmail) : null,
    contractSignerSameAsRequester: input.contractSignerSameAsRequester,
    contractSignerFullName: toNullableTrimmed(input.contractSignerFullName),
    contractSignerEmail: input.contractSignerEmail ? normalizeEmail(input.contractSignerEmail) : null,
    policiesAcceptedAt: new Date(input.policiesAcceptedAt).toISOString(),
    metadata: input.metadata ?? {},
  };

  const sourceIpSubnet = toIpv4Subnet(context.ipAddress);
  const sourceUserAgentHash = hashUserAgent(context.userAgent);

  const { data: existingRecord, error: existingError } = await supabase
    .from("company_registration_requests")
    .select("id,status")
    .eq("requester_email", normalised.requesterEmail)
    .in("status", ["pending", "approved", "rejected"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    authLogger.error("registration submit: pending lookup failed", {
      requestId: context.requestId,
      endpoint: "/api/auth/recruiter-registration",
      errCode: existingError.code,
    });
    throw new InternalAuthError(new Error(existingError.message));
  }

  if (existingRecord?.id) {
    addSentryBreadcrumb({
      category: "registration",
      message: "duplicate registration submission blocked by status",
      level: "info",
      data: {
        flow: "recruiter_registration",
        endpoint: "/api/auth/recruiter-registration",
        requestId: context.requestId,
        existingStatus: existingRecord.status,
      },
    });

    throw new ConflictError(
      `A registration request already exists with status '${existingRecord.status}'. Please contact support if you need changes.`,
    );
  }

  const { data, error } = await supabase
    .from("company_registration_requests")
    .insert({
      status: "pending",
      requester_full_name: normalised.requesterFullName,
      requester_email: normalised.requesterEmail,
      requester_phone: normalised.requesterPhone,
      requester_role_title: normalised.requesterRoleTitle,
      is_uk_registered: normalised.isUkRegistered,
      company_name: normalised.companyName,
      company_origin_country: normalised.companyOriginCountry,
      uk_company_number: normalised.ukCompanyNumber,
      office_address_line1: normalised.officeAddressLine1,
      office_address_line2: normalised.officeAddressLine2,
      office_city: normalised.officeCity,
      office_postcode: normalised.officePostcode,
      company_website: normalised.companyWebsite,
      requested_seat_count: normalised.requestedSeatCount,
      has_internal_approver: normalised.hasInternalApprover,
      internal_approver_full_name: normalised.internalApproverFullName,
      internal_approver_email: normalised.internalApproverEmail,
      contract_signer_same_as_requester: normalised.contractSignerSameAsRequester,
      contract_signer_full_name: normalised.contractSignerFullName,
      contract_signer_email: normalised.contractSignerEmail,
      policies_accepted_at: normalised.policiesAcceptedAt,
      source_ip_subnet: sourceIpSubnet,
      source_user_agent_hash: sourceUserAgentHash,
      metadata: normalised.metadata,
    })
    .select("id, status")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      const { data: deduped } = await supabase
        .from("company_registration_requests")
        .select("id")
        .eq("requester_email", normalised.requesterEmail)
        .eq("status", "pending")
        .maybeSingle();

      if (deduped?.id) {
        return {
          requestId: deduped.id,
          status: "pending",
          deduplicated: true,
        };
      }
    }

    authLogger.error("registration submit: insert failed", {
      requestId: context.requestId,
      endpoint: "/api/auth/recruiter-registration",
      errCode: error?.code,
      errMessage: error?.message,
    });
    throw new InternalAuthError(error ? new Error(error.message) : undefined);
  }

  addSentryBreadcrumb({
    category: "registration",
    message: "recruiter registration request created",
    level: "info",
    data: {
      flow: "recruiter_registration",
      endpoint: "/api/auth/recruiter-registration",
      requestId: context.requestId,
      outcome: "created",
    },
  });

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: context.requestId,
    occurredAt: new Date().toISOString(),
    event: "auth.account.registration_request_created",
    detail: "Recruiter registration request submitted",
    ipAddress: context.ipAddress,
  });

  return {
    requestId: data.id as string,
    status: data.status as RegistrationStatus,
    deduplicated: false,
  };
}

export async function getRecruiterAccountStatus(userId: string): Promise<{
  companyId: string;
  accountStatus: AccountStatus;
  statusReason: string | null;
} | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, user_id, account_status, status_reason, status_changed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new InternalAuthError(new Error(error.message));
  }

  if (!data) return null;
  const parsed = CompanyStatusRowSchema.safeParse(data);
  if (!parsed.success) {
    throw new InternalAuthError(parsed.error);
  }

  return {
    companyId: parsed.data.id,
    accountStatus: parsed.data.account_status,
    statusReason: parsed.data.status_reason ?? null,
  };
}
