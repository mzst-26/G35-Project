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

// ---------------------------------------------------------------------------
// Shared field definitions
// ---------------------------------------------------------------------------

const emailField = z
  .string({ required_error: "Email is required." })
  .email("Must be a valid email address.")
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
