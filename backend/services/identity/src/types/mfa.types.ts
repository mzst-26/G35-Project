/**
 * MFA type contracts.
 *
 * Covers Supabase built-in TOTP MFA (Time-based One-Time Password) —
 * the primary second factor — and the step-up MFA re-challenge flow
 * used before sensitive operations.
 */

// ---------------------------------------------------------------------------
// MFA factor
// ---------------------------------------------------------------------------

/**
 * Supported MFA factor types.
 * Supabase currently supports TOTP; we model the interface for extension.
 */
export type MfaFactorType = "totp";

/**
 * Status of a user's registered MFA factor.
 *
 * - unverified : Enrolled but not yet confirmed by the user.
 * - verified   : Active and usable for challenges.
 */
export type MfaFactorStatus = "unverified" | "verified";

/**
 * A registered MFA factor record returned from Supabase.
 */
export interface MfaFactor {
  readonly factorId: string;
  readonly type: MfaFactorType;
  readonly status: MfaFactorStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

/**
 * Input for starting MFA enrollment.
 * The user must be authenticated (valid session) to enroll.
 */
export interface MfaEnrollRequest {
  /** The factor type to enroll. Currently always "totp". */
  readonly type: MfaFactorType;
  /** Human-readable label shown in the authenticator app. */
  readonly friendlyName: string;
}

/**
 * Response from beginning a TOTP enrollment.
 * Contains the QR code URI and manual entry key to show the user.
 */
export interface MfaEnrollResult {
  readonly factorId: string;
  /** otpauth:// URI for QR code generation on the client. */
  readonly totpUri: string;
  /** Base32-encoded TOTP secret for manual entry. */
  readonly totpSecret: string;
}

// ---------------------------------------------------------------------------
// Challenge
// ---------------------------------------------------------------------------

/**
 * Input for creating a new MFA challenge (step 1 of 2 in MFA verify flow).
 */
export interface MfaChallengeRequest {
  readonly factorId: string;
}

/**
 * Response from creating the challenge. The challenge ID is needed to verify.
 */
export interface MfaChallengeResult {
  readonly challengeId: string;
  /** ISO-8601 timestamp when the challenge expires (typically 5 minutes). */
  readonly expiresAt: string;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Input for verifying a TOTP code against an existing challenge (step 2).
 */
export interface MfaVerifyRequest {
  readonly factorId: string;
  readonly challengeId: string;
  /** 6-digit TOTP code from the authenticator app. */
  readonly code: string;
}

/**
 * Outcome of a successful MFA verification.
 * On success the session is upgraded to `amr: ["mfa"]` in Supabase.
 */
export interface MfaVerifyResult {
  readonly verified: boolean;
  /** Updated access token with the elevated AMR claim. */
  readonly accessToken: string;
}

// ---------------------------------------------------------------------------
// Factor management
// ---------------------------------------------------------------------------

/**
 * Input for unenrolling / revoking an MFA factor.
 * Only the factor owner or an admin may call this.
 */
export interface MfaRevokeRequest {
  readonly factorId: string;
}

export interface MfaRevokeResult {
  readonly revoked: boolean;
}

// ---------------------------------------------------------------------------
// Step-up guard state
// ---------------------------------------------------------------------------

/**
 * Result of checking whether the current session meets step-up MFA requirements.
 */
export type StepUpCheckResult =
  | { readonly required: false }
  | { readonly required: true; readonly challengeUrl: string };
