import crypto from "node:crypto";
import { z } from "zod";
import { createServiceRoleClient } from "../supabase/index.js";
import { InternalAuthError } from "../errors/index.js";

export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type RegistrationStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type RegistrationDecision = "approve" | "reject";

export interface RecruiterRegistrationSubmitInput {
  requesterFullName: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterRoleTitle: string;
  isUkRegistered: boolean;
  companyName: string;
  companyOriginCountry?: string | null;
  ukCompanyNumber?: string | null;
  officeAddressLine1: string;
  officeAddressLine2?: string | null;
  officeCity: string;
  officePostcode: string;
  companyWebsite?: string | null;
  requestedSeatCount: number;
  hasInternalApprover: boolean;
  internalApproverFullName?: string | null;
  internalApproverEmail?: string | null;
  contractSignerSameAsRequester: boolean;
  contractSignerFullName?: string | null;
  contractSignerEmail?: string | null;
  policiesAcceptedAt: string;
  metadata?: Record<string, unknown>;
}

export interface RecruiterRegistrationListFilters {
  status?: RegistrationStatus;
  limit: number;
  offset: number;
}

export interface RegistrationDecisionInput {
  requestId: string;
  decision: RegistrationDecision;
  reason: string;
  adminUserId: string;
}

export interface RecruiterRegistrationRecord {
  id: string;
  status: RegistrationStatus;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedByAdminUserId: string | null;
  reviewReason: string | null;
  requesterFullName: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterRoleTitle: string;
  isUkRegistered: boolean;
  companyName: string;
  companyOriginCountry: string | null;
  ukCompanyNumber: string | null;
  officeAddressLine1: string;
  officeAddressLine2: string | null;
  officeCity: string;
  officePostcode: string;
  companyWebsite: string | null;
  requestedSeatCount: number;
  hasInternalApprover: boolean;
  internalApproverFullName: string | null;
  internalApproverEmail: string | null;
  contractSignerSameAsRequester: boolean;
  contractSignerFullName: string | null;
  contractSignerEmail: string | null;
  policiesAcceptedAt: string;
  approvedUserId: string | null;
  approvedCompanyId: string | null;
}

export const RegistrationRowSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "withdrawn"]),
  submitted_at: z.string(),
  updated_at: z.string(),
  reviewed_at: z.string().nullable(),
  reviewed_by_admin_user_id: z.string().uuid().nullable(),
  review_reason: z.string().nullable(),
  requester_full_name: z.string(),
  requester_email: z.string(),
  requester_phone: z.string(),
  requester_role_title: z.string(),
  is_uk_registered: z.boolean(),
  company_name: z.string(),
  company_origin_country: z.string().nullable(),
  uk_company_number: z.string().nullable(),
  office_address_line1: z.string(),
  office_address_line2: z.string().nullable(),
  office_city: z.string(),
  office_postcode: z.string(),
  company_website: z.string().nullable(),
  requested_seat_count: z.number().int(),
  has_internal_approver: z.boolean(),
  internal_approver_full_name: z.string().nullable(),
  internal_approver_email: z.string().nullable(),
  contract_signer_same_as_requester: z.boolean(),
  contract_signer_full_name: z.string().nullable(),
  contract_signer_email: z.string().nullable(),
  policies_accepted_at: z.string(),
  approved_user_id: z.string().uuid().nullable(),
  approved_company_id: z.string().uuid().nullable(),
});

export const CompanyStatusRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_status: z.enum(["pending", "approved", "rejected", "suspended"]),
  status_reason: z.string().nullable().optional(),
  status_changed_at: z.string().nullable().optional(),
});

export function toNullableTrimmed(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeName(value: string): string {
  return normalizeSpaces(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeAddress(value: string): string {
  return normalizeSpaces(value);
}

export function normalizePostcode(value: string): string {
  return normalizeSpaces(value).toUpperCase();
}

export function normalizeWebsite(value?: string | null): string | null {
  const trimmed = toNullableTrimmed(value);
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function normalizePhone(value: string): string {
  return value.trim();
}

export function mapRegistrationRow(row: z.infer<typeof RegistrationRowSchema>): RecruiterRegistrationRecord {
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    reviewedByAdminUserId: row.reviewed_by_admin_user_id,
    reviewReason: row.review_reason,
    requesterFullName: row.requester_full_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    requesterRoleTitle: row.requester_role_title,
    isUkRegistered: row.is_uk_registered,
    companyName: row.company_name,
    companyOriginCountry: row.company_origin_country,
    ukCompanyNumber: row.uk_company_number,
    officeAddressLine1: row.office_address_line1,
    officeAddressLine2: row.office_address_line2,
    officeCity: row.office_city,
    officePostcode: row.office_postcode,
    companyWebsite: row.company_website,
    requestedSeatCount: row.requested_seat_count,
    hasInternalApprover: row.has_internal_approver,
    internalApproverFullName: row.internal_approver_full_name,
    internalApproverEmail: row.internal_approver_email,
    contractSignerSameAsRequester: row.contract_signer_same_as_requester,
    contractSignerFullName: row.contract_signer_full_name,
    contractSignerEmail: row.contract_signer_email,
    policiesAcceptedAt: row.policies_accepted_at,
    approvedUserId: row.approved_user_id,
    approvedCompanyId: row.approved_company_id,
  };
}

export function toIpv4Subnet(ipValue: string | undefined): string | null {
  if (!ipValue) return null;
  const ip = ipValue.replace("::ffff:", "").trim();
  const parts = ip.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return null;
}

export function hashUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent || userAgent.trim().length === 0) return null;
  return crypto.createHash("sha256").update(userAgent).digest("hex").slice(0, 24);
}

export async function ensureRecruiterUser(
  requesterEmail: string,
  requesterFullName: string,
  requesterPhone: string,
): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("id")
    .eq("email", requesterEmail)
    .maybeSingle();

  if (existingUserError && existingUserError.code !== "PGRST116") {
    throw new InternalAuthError(new Error(existingUserError.message));
  }
  if (existingUser?.id) return existingUser.id as string;

  const created = await supabase.auth.admin.createUser({
    email: requesterEmail,
    email_confirm: true,
    app_metadata: { role: "recruiter" },
  });

  if (created.error || !created.data.user?.id) {
    throw new InternalAuthError(created.error ? new Error(created.error.message) : undefined);
  }

  const { error: insertPublicError } = await supabase.from("users").insert({
    id: created.data.user.id,
    email: requesterEmail,
    full_name: requesterFullName,
    phone_number: requesterPhone,
    role: "recruiter",
  });

  if (insertPublicError && insertPublicError.code !== "23505") {
    throw new InternalAuthError(new Error(insertPublicError.message));
  }

  return created.data.user.id;
}

export async function ensureCompanyForUser(
  userId: string,
  request: RecruiterRegistrationRecord,
  adminUserId: string,
  reason: string,
): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data: existingCompany, error: existingCompanyError } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingCompanyError && existingCompanyError.code !== "PGRST116") {
    throw new InternalAuthError(new Error(existingCompanyError.message));
  }

  const commonPayload = {
    account_status: "approved",
    status_changed_at: new Date().toISOString(),
    status_changed_by: adminUserId,
    status_reason: reason,
    registration_request_id: request.id,
  };

  if (existingCompany?.id) {
    const { error: updateError } = await supabase
      .from("companies")
      .update(commonPayload)
      .eq("id", existingCompany.id);

    if (updateError) {
      throw new InternalAuthError(new Error(updateError.message));
    }

    return existingCompany.id as string;
  }

  const { data: createdCompany, error: createCompanyError } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      company_name: request.companyName,
      address_line1: request.officeAddressLine1,
      address_line2: request.officeAddressLine2,
      city: request.officeCity,
      postcode: request.officePostcode,
      ...commonPayload,
    })
    .select("id")
    .single();

  if (createCompanyError || !createdCompany?.id) {
    throw new InternalAuthError(createCompanyError ? new Error(createCompanyError.message) : undefined);
  }
  return createdCompany.id as string;
}
