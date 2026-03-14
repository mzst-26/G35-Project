// OTP authentication service.
//
// Handles the Email OTP sign-in flow:
//   1. requestOtp  — tells Supabase to dispatch an OTP email.
//   2. verifyOtp   — validates the OTP, extracts identity, builds session.
//
// Security guarantees:
//   - requestOtp always returns success regardless of whether the email is
//     registered (prevents email enumeration).
//   - verifyOtp errors never distinguish "wrong OTP" from "expired OTP".
//   - All events use a hashed email, never the raw address.

import crypto from "node:crypto";
import type {
  OtpRequest,
  OtpRequestResult,
  OtpVerifyRequest,
  OtpVerifyResult,
  AuthenticatedUser,
  Session,
} from "../types/index.js";
import type {
  OtpRequestedEvent,
  SessionCreatedEvent,
} from "../types/audit.types.js";
import type { UserRole } from "../types/role.types.js";
import { createAnonClient, createServiceRoleClient } from "../supabase/index.js";
import { AuthenticationError, InternalAuthError } from "../errors/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { authLogger } from "../observability/logger.js";
import { decodeJwtPayload, persistSession } from "./session.service.js";

const VALID_ROLES = new Set<UserRole>(["admin", "recruiter", "trade"]);

/** SHA-256 hash of a lowercased email — safe to log. */
function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// OTP request
// ---------------------------------------------------------------------------

/**
 * Dispatches an OTP email via Supabase Auth.
 *
 * Always resolves successfully regardless of whether the email is registered.
 * Any Supabase error is logged internally but swallowed from the caller.
 *
 * @throws InternalAuthError only when Supabase is entirely unreachable.
 */
export async function requestOtp(input: OtpRequest): Promise<OtpRequestResult> {
  const messageId = crypto.randomUUID();
  const emailHash = hashEmail(input.email);

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        // Prevent auto-creating users — only pre-provisioned accounts can sign in.
        shouldCreateUser: false,
      },
    });

    if (error) {
      // Log the real error but don't propagate it — prevents enumeration.
      authLogger.warn("OTP dispatch error (suppressed from caller)", {
        emailHash,
        supabaseError: error.message,
        code: error.code,
      });
    }
  } catch (err) {
    authLogger.error("Supabase unreachable during OTP dispatch", { emailHash, err });
    throw new InternalAuthError(err instanceof Error ? err : undefined);
  }

  emitSecurityEvent({
    eventId: messageId,
    requestId: messageId,
    occurredAt: new Date().toISOString(),
    event: "auth.otp.requested",
    emailHash,
  } as OtpRequestedEvent);

  return { messageId };
}

// ---------------------------------------------------------------------------
// OTP verify + session creation
// ---------------------------------------------------------------------------

/**
 * Verifies the OTP and creates a platform session on success.
 *
 * @throws AuthenticationError code OTP_INVALID for wrong/expired OTPs.
 * @throws AuthenticationError code ROLE_NOT_RECOGNISED when role is missing.
 * @throws InternalAuthError for unexpected Supabase failures.
 */
export async function verifyOtp(input: OtpVerifyRequest): Promise<OtpVerifyResult> {
  const emailHash = hashEmail(input.email);

  let sbUserId!: string;
  let sbUserEmail!: string;
  let rawRole: string | undefined;
  let sbAccessToken!: string;
  let sbRefreshToken!: string;
  let sbExpiresIn!: number;

  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: input.email,
      token: input.token,
      type: "email",
    });

    if (error || !data.session || !data.user) {
      authLogger.warn("OTP verification failed", { emailHash, error: error?.message });
      emitSecurityEvent({
        eventId: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        event: "auth.otp.failed",
      });
      throw new AuthenticationError(
        "OTP verification failed. The code may be invalid or expired.",
        "OTP_INVALID",
      );
    }

    sbUserId = data.user.id;
    sbUserEmail = data.user.email ?? "";
    rawRole = data.user.app_metadata?.role as string | undefined;
    sbAccessToken = data.session.access_token;
    sbRefreshToken = data.session.refresh_token;
    sbExpiresIn = data.session.expires_in ?? 900;
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    authLogger.error("Unexpected error during OTP verification", { emailHash, err });
    throw new InternalAuthError(err instanceof Error ? err : undefined);
  }

  // Validate role from app_metadata.
  if (!rawRole || !VALID_ROLES.has(rawRole as UserRole)) {
    authLogger.warn("User authenticated but has no valid role claim", {
      userId: sbUserId,
      rawRole,
    });
    throw new AuthenticationError(
      "Your account does not have a recognised platform role. Contact support.",
      "ROLE_NOT_RECOGNISED",
    );
  }
  const role = rawRole as UserRole;

  // Admins must have at least one verified TOTP factor before the platform
  // will grant them a session. Prompt enrollment if no verified factor exists.
  if (role === "admin") {
    try {
      const adminClient = createServiceRoleClient();
      const { data: factors, error: mfaError } = await adminClient.auth.admin.mfa.listFactors(
        { userId: sbUserId },
      );
      if (mfaError) {
        authLogger.warn("Could not verify admin MFA factors", { userId: sbUserId, mfaError });
        throw new AuthenticationError("MFA verification unavailable. Contact support.", "MFA_ENROLLMENT_REQUIRED");
      }
      const hasVerifiedFactor = factors?.factors?.some(
        (f: { factor_type: string; status: string }) =>
          f.factor_type === "totp" && f.status === "verified"
      );
      if (!hasVerifiedFactor) {
        throw new AuthenticationError(
          "Admin accounts require a verified TOTP MFA factor. Please enroll MFA before signing in.",
          "MFA_ENROLLMENT_REQUIRED",
        );
      }
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      authLogger.error("Unexpected error during admin MFA check", { userId: sbUserId, err });
      throw new InternalAuthError(err instanceof Error ? err : undefined);
    }
  }

  const expiresAt = Math.floor(Date.now() / 1000) + sbExpiresIn;
  const now = new Date().toISOString();

  // Use the Supabase JWT session_id so our auth_sessions row maps 1:1 with the JWT.
  const jwtPayload = decodeJwtPayload(sbAccessToken);
  const sessionId = typeof jwtPayload["session_id"] === "string"
    ? jwtPayload["session_id"]
    : crypto.randomUUID();

  const user: AuthenticatedUser = {
    id: sbUserId,
    email: sbUserEmail,
    role,
    stepUpVerified: false,
    expiresAt,
  };

  const platformSession: Session = {
    sessionId,
    userId: sbUserId,
    role,
    createdAt: now,
    expiresAt: new Date((expiresAt + 7 * 24 * 60 * 60 - sbExpiresIn) * 1000).toISOString(),
    lastActiveAt: now,
    stepUpVerified: false,
    ipAddress: input.ipAddress ?? null,
    userAgentHash: input.userAgentHash ?? null,
  };

  // Persist to DB for revocation + audit — fire-and-forget (non-fatal).
  persistSession(platformSession).catch((err) => {
    authLogger.warn("persistSession failed silently", { sessionId, err });
  });

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    occurredAt: now,
    event: "auth.otp.verified",
  });

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    occurredAt: now,
    event: "auth.session.created",
    userId: sbUserId,
    role,
    sessionId,
  } as SessionCreatedEvent);

  return {
    user,
    session: platformSession,
    accessToken: sbAccessToken,
    refreshToken: sbRefreshToken,
  };
}


