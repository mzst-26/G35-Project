/**
 * Core authentication type contracts.
 *
 * Defines inputs, outputs, and domain objects for every authentication
 * operation: OTP sign-in, session lifecycle, token content, and user identity.
 * All handler and service function signatures must use these types.
 */

import type { UserRole } from "./role.types.js";

// ---------------------------------------------------------------------------
// Verified identity attached to every authenticated request
// ---------------------------------------------------------------------------

/**
 * The minimal, verified representation of the authenticated user that is
 * attached to `req.user` by the authenticate middleware. Nothing beyond what
 * is encoded in the verified JWT/session is stored here — no DB lookups.
 */
export interface AuthenticatedUser {
  /** Supabase user UUID — primary identity key across all services. */
  readonly id: string;
  /** User's email address (from Supabase Auth). */
  readonly email: string;
  /** Platform role derived from `app_metadata.role` in the Supabase token. */
  readonly role: UserRole;
  /**
   * Whether the current session has passed a step-up MFA challenge
   * in addition to the base MFA at login.
   */
  readonly stepUpVerified: boolean;
  /** Unix timestamp (seconds) when the access token expires. */
  readonly expiresAt: number;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * A platform session record. Stored server-side for audit and revocation.
 */
export interface Session {
  /** Platform session ID (UUID). */
  readonly sessionId: string;
  /** Supabase user UUID. */
  readonly userId: string;
  /** Role at the time of session creation. */
  readonly role: UserRole;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 expiry timestamp (absolute maximum, 30 days). */
  readonly expiresAt: string;
  /** ISO-8601 of last activity (reset on each authenticated request). */
  readonly lastActiveAt: string;
  /** Whether step-up MFA was completed in this session. */
  readonly stepUpVerified: boolean;
  /**
   * IP address at session creation (for audit trail only — not used for
   * blocking to avoid breaking mobile/NAT users without explicit policy).
   */
  readonly ipAddress: string | null;
  /**
   * User-Agent header hash at session creation (for audit only).
   * We store a short hash, never the raw string, to reduce PII surface.
   */
  readonly userAgentHash: string | null;
}

// ---------------------------------------------------------------------------
// OTP sign-in
// ---------------------------------------------------------------------------

/**
 * Input for requesting a one-time password to be sent to an email address.
 * Validated by `src/security/validators.ts` before the service is called.
 */
export interface OtpRequest {
  readonly email: string;
}

/**
 * Response after a successful OTP dispatch.
 * We never confirm whether the email exists — always return this shape.
 */
export interface OtpRequestResult {
  readonly messageId: string;
}

/**
 * Input for verifying the OTP the user entered.
 */
export interface OtpVerifyRequest {
  readonly email: string;
  readonly token: string;
  // Populated by the route handler from req.ip and user-agent header.
  readonly ipAddress?: string | null;
  readonly userAgentHash?: string | null;
}

/**
 * Response after successful OTP verification where the user is fully authenticated.
 */
export interface OtpVerifyResult {
  readonly user: AuthenticatedUser;
  readonly session: Session;
  /**
   * The Supabase access JWT — short-lived (15 min).
   * Set as httpOnly, secure, sameSite=Strict cookie by the route handler.
   */
  readonly accessToken: string;
  /**
   * The Supabase refresh token — rotated on every use.
   * Set as httpOnly, secure, sameSite=Strict cookie by the route handler.
   * Never exposed to client JavaScript.
   */
  readonly refreshToken: string;
  readonly mfaSetupRequired?: false;
}

/**
 * Response when an admin has verified their OTP but has no TOTP factor enrolled.
 *
 * The route handler sets the Supabase access token cookie so that the client
 * can immediately call the MFA enrollment endpoints without re-authenticating.
 * No platform session is created yet — that happens after TOTP enrollment is
 * completed via POST /api/auth/mfa/complete-admin-login.
 */
export interface OtpVerifyMfaSetupResult {
  readonly mfaSetupRequired: true;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export type OtpVerifyOutcome = OtpVerifyResult | OtpVerifyMfaSetupResult;

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

/** Input for refreshing an access token. */
export interface SessionRefreshRequest {
  /** Refresh token read from the httpOnly cookie by the route handler. */
  readonly refreshToken: string;
}

/** Output of a successful token refresh. */
export interface SessionRefreshResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
}

/** Input for an explicit logout. */
export interface LogoutRequest {
  /** Platform session ID — used to purge the server-side record. Omit for bulk revocation. */
  readonly sessionId?: string;
  /** Supabase user ID for audit logging. */
  readonly userId: string;
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

/**
 * The result of validating an inbound access token.
 * If `valid` is false, `user` and `error` are set accordingly.
 */
export type TokenValidationResult =
  | { readonly valid: true; readonly user: AuthenticatedUser }
  | { readonly valid: false; readonly error: TokenValidationError };

export type TokenValidationError =
  | "token_expired"
  | "token_invalid"
  | "token_missing"
  | "role_claim_missing"
  | "role_not_recognised"
  // Session was explicitly revoked — DB check found revoked_at set.
  | "session_revoked";
