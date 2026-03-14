/**
 * Input validation schemas for all authentication API endpoints.
 *
 * Uses Zod for runtime validation with precise, actionable error messages.
 * Each schema is a pure data type definition — no business logic here.
 *
 * These schemas are consumed by:
 *  1. Route handlers (validate request bodies before calling services).
 *  2. Unit tests (verify schema boundaries directly without HTTP overhead).
 *
 * All schemas export both the Zod schema (for `.parse()`/`.safeParse()`) and
 * the inferred TypeScript type (for use in function signatures).
 */

import { z } from "zod";
import { EMAIL_MAX_LENGTH, EMAIL_REGEX } from "@infra/shared-utils";

// ---------------------------------------------------------------------------
// Shared field definitions
// ---------------------------------------------------------------------------

const emailField = z
  .string({ required_error: "Email is required." })
  .max(EMAIL_MAX_LENGTH, "Email must be 254 characters or fewer.")
  .regex(EMAIL_REGEX, "Must be a valid email address.")
  .toLowerCase()
  .trim();

const otpTokenField = z
  .string({ required_error: "OTP token is required." })
  .length(6, "OTP token must be exactly 6 characters.")
  .regex(/^\d{6}$/, "OTP token must be a 6-digit numeric code.");

const totpCodeField = z
  .string({ required_error: "TOTP code is required." })
  .length(6, "TOTP code must be exactly 6 characters.")
  .regex(/^\d{6}$/, "TOTP code must be a 6-digit numeric code.");

const uuidField = (fieldName: string) =>
  z
    .string({ required_error: `${fieldName} is required.` })
    .uuid(`${fieldName} must be a valid UUID.`);

// ---------------------------------------------------------------------------
// OTP request — POST /api/auth/otp/request
// ---------------------------------------------------------------------------

export const OtpRequestSchema = z.object({
  email: emailField,
});

export type OtpRequestInput = z.infer<typeof OtpRequestSchema>;

// ---------------------------------------------------------------------------
// OTP verify — POST /api/auth/otp/verify
// ---------------------------------------------------------------------------

export const OtpVerifySchema = z.object({
  email: emailField,
  token: otpTokenField,
});

export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;

// ---------------------------------------------------------------------------
// Session refresh — POST /api/auth/session/refresh
// (Token is read from the httpOnly cookie, not the body — body is empty)
// ---------------------------------------------------------------------------

export const SessionRefreshSchema = z.object({});

export type SessionRefreshInput = z.infer<typeof SessionRefreshSchema>;

// ---------------------------------------------------------------------------
// Logout — POST /api/auth/session/logout
// ---------------------------------------------------------------------------

export const LogoutSchema = z.object({
  sessionId: uuidField("sessionId"),
});

export type LogoutInput = z.infer<typeof LogoutSchema>;

// ---------------------------------------------------------------------------
// MFA enrollment — POST /api/auth/mfa/enroll
// ---------------------------------------------------------------------------

export const MfaEnrollSchema = z.object({
  type: z.literal("totp", {
    required_error: "MFA type is required.",
    invalid_type_error: "MFA type must be 'totp'.",
  }),
  // Optional — defaults to "Authenticator" in the route if omitted.
  friendlyName: z
    .string()
    .min(1, "Friendly name must not be empty.")
    .max(64, "Friendly name must be 64 characters or fewer.")
    .trim()
    .optional(),
});

export type MfaEnrollInput = z.infer<typeof MfaEnrollSchema>;

// ---------------------------------------------------------------------------
// MFA challenge — POST /api/auth/mfa/challenge
// ---------------------------------------------------------------------------

export const MfaChallengeSchema = z.object({
  factorId: uuidField("factorId"),
});

export type MfaChallengeInput = z.infer<typeof MfaChallengeSchema>;

// ---------------------------------------------------------------------------
// MFA verify — POST /api/auth/mfa/verify
// ---------------------------------------------------------------------------

export const MfaVerifySchema = z.object({
  factorId: uuidField("factorId"),
  challengeId: uuidField("challengeId"),
  code: totpCodeField,
});

export type MfaVerifyInput = z.infer<typeof MfaVerifySchema>;

// ---------------------------------------------------------------------------
// MFA factor revoke — DELETE /api/auth/mfa/factors/:factorId
// ---------------------------------------------------------------------------

export const MfaRevokeParamsSchema = z.object({
  factorId: uuidField("factorId"),
});

export type MfaRevokeParams = z.infer<typeof MfaRevokeParamsSchema>;

// ---------------------------------------------------------------------------
// Recruiter registration submit — POST /api/auth/recruiter-registration
// ---------------------------------------------------------------------------

const nonEmptyText = (field: string, max = 120) =>
  z
    .string({ required_error: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`)
    .max(max, `${field} must be ${max} characters or fewer.`);

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .or(z.literal(""));

const fullNameField = (field: string, max = 120) =>
  nonEmptyText(field, max).refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, {
    message: `${field} must include first and last name.`,
  });

const phoneField = z
  .string({ required_error: "Requester phone is required." })
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Requester phone must be in international format (for example +447700900123).");

export const RecruiterRegistrationSubmitSchema = z
  .object({
    requesterFullName: fullNameField("Requester full name", 120),
    requesterEmail: emailField,
    requesterPhone: phoneField,
    requesterRoleTitle: nonEmptyText("Requester role title", 120),
    isUkRegistered: z.boolean(),
    companyName: nonEmptyText("Company name", 160),
    companyOriginCountry: optionalText(120).transform((value) => (value ? value : undefined)),
    ukCompanyNumber: optionalText(20).transform((value) => (value ? value : undefined)),
    officeAddressLine1: nonEmptyText("Office address line 1", 180),
    officeAddressLine2: optionalText(180).transform((value) => (value ? value : undefined)),
    officeCity: nonEmptyText("Office city", 120),
    officePostcode: nonEmptyText("Office postcode", 20),
    companyWebsite: optionalText(200).transform((value) => (value ? value : undefined)),
    requestedSeatCount: z
      .number({ required_error: "Requested seat count is required." })
      .int("Requested seat count must be an integer.")
      .min(1, "Requested seat count must be at least 1.")
      .max(10000, "Requested seat count must be 10000 or fewer."),
    hasInternalApprover: z.boolean(),
    internalApproverFullName: optionalText(120)
      .transform((value) => (value ? value : undefined))
      .refine((value) => !value || value.split(/\s+/).filter(Boolean).length >= 2, {
        message: "Internal approver full name must include first and last name.",
      }),
    internalApproverEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(EMAIL_MAX_LENGTH, "Email must be 254 characters or fewer.")
      .refine((v) => v === "" || EMAIL_REGEX.test(v), "Must be a valid email address.")
      .optional()
      .or(z.literal("")),
    contractSignerSameAsRequester: z.boolean(),
    contractSignerFullName: optionalText(120).transform((value) => (value ? value : undefined)),
    contractSignerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(EMAIL_MAX_LENGTH, "Email must be 254 characters or fewer.")
      .refine((v) => v === "" || EMAIL_REGEX.test(v), "Must be a valid email address.")
      .optional()
      .or(z.literal("")),
    policiesAcceptedAt: z.string().datetime({ message: "Policies accepted timestamp must be a valid ISO date-time." }),
    metadata: z.record(z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hasInternalApprover) {
      if (!value.internalApproverFullName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["internalApproverFullName"],
          message: "Internal approver full name is required when internal approver is enabled.",
        });
      }
      if (!value.internalApproverEmail || value.internalApproverEmail === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["internalApproverEmail"],
          message: "Internal approver email is required when internal approver is enabled.",
        });
      }
    }

    if (!value.contractSignerSameAsRequester) {
      if (!value.contractSignerFullName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contractSignerFullName"],
          message: "Contract signer full name is required when signer differs from requester.",
        });
      }
      if (!value.contractSignerEmail || value.contractSignerEmail === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contractSignerEmail"],
          message: "Contract signer email is required when signer differs from requester.",
        });
      }
    }

    if (value.isUkRegistered && !value.ukCompanyNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ukCompanyNumber"],
        message: "Please select a valid UK company from search results.",
      });
    }

    if (!value.isUkRegistered && !value.companyOriginCountry?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyOriginCountry"],
        message: "Company origin country is required for non-UK companies.",
      });
    }
  });

export type RecruiterRegistrationSubmitInput = z.infer<typeof RecruiterRegistrationSubmitSchema>;

export const UkCompanyLookupQuerySchema = z.object({
  q: z
    .string({ required_error: "Query is required." })
    .trim()
    .min(2, "Query must be at least 2 characters.")
    .max(160, "Query must be 160 characters or fewer."),
});

export type UkCompanyLookupQueryInput = z.infer<typeof UkCompanyLookupQuerySchema>;

// ---------------------------------------------------------------------------
// Admin registration list/detail/decision
// ---------------------------------------------------------------------------

export const AdminRegistrationListQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "withdrawn"]).optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer.")
    .transform((value) => Number(value))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/, "offset must be a non-negative integer.")
    .transform((value) => Number(value))
    .pipe(z.number().int().min(0))
    .optional(),
});

export const AdminRegistrationRequestIdParamsSchema = z.object({
  requestId: uuidField("requestId"),
});

export const AdminRegistrationDecisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().min(1, "Reason is required.").max(1000, "Reason must be 1000 characters or fewer."),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "approve" && value.reason.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Approval reason must be at least 3 characters.",
      });
    }
  });

export type AdminRegistrationListQueryInput = z.infer<typeof AdminRegistrationListQuerySchema>;
export type AdminRegistrationRequestIdParamsInput = z.infer<typeof AdminRegistrationRequestIdParamsSchema>;
export type AdminRegistrationDecisionInput = z.infer<typeof AdminRegistrationDecisionSchema>;

// ---------------------------------------------------------------------------
// Shared helper: parse or throw ValidationError
// ---------------------------------------------------------------------------

import { ValidationError } from "../errors/index.js";

/**
 * Parses `data` against `schema` and returns the typed result.
 * Throws `ValidationError` with structured field errors if validation fails.
 *
 * Use this in every route handler instead of calling `.parse()` directly so
 * that validation failures are always returned as consistent HTTP 400 responses.
 *
 * @example
 *   const body = parseOrThrow(OtpRequestSchema, req.body);
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    throw new ValidationError("Request validation failed.", issues);
  }

  return result.data;
}
