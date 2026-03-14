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
  OtpVerifyOutcome,
  AuthenticatedUser,
} from "../types/index.js";
import type {
  OtpRequestedEvent,
  SessionCreatedEvent,
} from "../types/audit.types.js";
import type { UserRole } from "../types/role.types.js";
import { createAnonClient, createServiceRoleClient } from "../supabase/index.js";
import { getRecruiterAccountStatus } from "./companyRegistration.service.js";
import { AuthenticationError, InternalAuthError } from "../errors/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { authLogger } from "../observability/logger.js";
import { addSentryBreadcrumb, captureSentryBusinessFailure } from "../observability/sentry.js";
import { persistSession, buildPlatformSession } from "./session.service.js";
import { hasVerifiedTotpFactor } from "./mfa.service.js";

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
 * For admin accounts with no verified TOTP factor, returns `{ mfaSetupRequired: true }`
 * along with the Supabase tokens so the client can proceed to MFA enrollment.
 * No platform session is persisted in that case — enrollment must be completed first.
 *
 * @throws AuthenticationError code OTP_INVALID for wrong/expired OTPs.
 * @throws AuthenticationError code ROLE_NOT_RECOGNISED when role is missing.
 * @throws InternalAuthError for unexpected Supabase failures.
 */
export async function verifyOtp(input: OtpVerifyRequest): Promise<OtpVerifyOutcome> {
  const emailHash = hashEmail(input.email);

  let sbUserId!: string;
  let sbUserEmail!: string;
  let rawRole: string | undefined;
  let sbAccessToken!: string;
  let sbRefreshToken!: string;

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

  if (role === "recruiter") {
    try {
      const company = await getRecruiterAccountStatus(sbUserId);
      const accountStatus = company?.accountStatus ?? "pending";

      if (accountStatus !== "approved") {
        const codeByStatus: Record<string, "ACCOUNT_PENDING_REVIEW" | "ACCOUNT_REJECTED" | "ACCOUNT_SUSPENDED"> = {
          pending: "ACCOUNT_PENDING_REVIEW",
          rejected: "ACCOUNT_REJECTED",
          suspended: "ACCOUNT_SUSPENDED",
        };

        const messageByStatus: Record<string, string> = {
          pending: "Your company account is pending admin approval.",
          rejected: "Your company account has been rejected. Contact support.",
          suspended: "Your company account is suspended. Contact support.",
        };

        emitSecurityEvent({
          eventId: crypto.randomUUID(),
          requestId: crypto.randomUUID(),
          occurredAt: new Date().toISOString(),
          event: "auth.account.login_gated",
          userId: sbUserId,
          role,
          flow: "otp_verify",
          endpoint: "/api/auth/otp/verify",
          accountStatus,
          detail: "Recruiter login denied due to company status",
        });

        addSentryBreadcrumb({
          category: "auth",
          message: "recruiter login gated",
          level: "warning",
          data: {
            flow: "otp_verify",
            endpoint: "/api/auth/otp/verify",
            role,
            account_status: accountStatus,
            userId: sbUserId,
          },
        });

        captureSentryBusinessFailure(
          "recruiter login denied by account status",
          {
            flow: "otp_verify",
            endpoint: "/api/auth/otp/verify",
            role,
            account_status: accountStatus,
          },
          {
            userId: sbUserId,
          },
        );

        throw new AuthenticationError(
          messageByStatus[accountStatus] ?? messageByStatus.pending,
          codeByStatus[accountStatus] ?? "ACCOUNT_PENDING_REVIEW",
        );
      }
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      authLogger.error("Unexpected error during recruiter account status check", {
        userId: sbUserId,
        err,
      });
      throw new InternalAuthError(err instanceof Error ? err : undefined);
    }
  }

  // Admins must have at least one verified TOTP factor before the platform
  // will grant them a session. Prompt enrollment if no verified factor exists.
  if (role === "admin") {
    const hasVerifiedFactor = await hasVerifiedTotpFactor(sbUserId);
    if (!hasVerifiedFactor) {
      authLogger.info("Admin OTP verified but no TOTP factor enrolled — returning mfaSetupRequired", {
        userId: sbUserId,
      });
      return {
        mfaSetupRequired: true,
        accessToken: sbAccessToken,
        refreshToken: sbRefreshToken,
      };
    }
  }

  const { session: platformSession, sessionId, expiresAt } = buildPlatformSession({
    accessToken: sbAccessToken,
    userId: sbUserId,
    role,
    ipAddress: input.ipAddress,
    userAgentHash: input.userAgentHash,
  });

  const now = new Date().toISOString();

  const user: AuthenticatedUser = {
    id: sbUserId,
    email: sbUserEmail,
    role,
    stepUpVerified: false,
    expiresAt,
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


