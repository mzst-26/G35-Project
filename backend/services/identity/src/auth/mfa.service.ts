// MFA service — TOTP lifecycle via Supabase built-in MFA APIs.
//
// All functions take the user's access token to scope Supabase operations
// to the authenticated user. The token is NOT stored in this module.
//
// MFA policy:
//   - Admin accounts: MFA required before first real session is granted.
//   - Recruiter/trade: optional at enrollment, required for step-up actions.
//   - Max one TOTP factor per user (Supabase default). ConflictError on second enroll.

import crypto from "node:crypto";
import type {
  MfaEnrollRequest,
  MfaEnrollResult,
  MfaChallengeRequest,
  MfaChallengeResult,
  MfaVerifyRequest,
  MfaVerifyResult,
  MfaRevokeRequest,
  MfaRevokeResult,
  MfaFactor,
} from "../types/index.js";
import { createServerClient, createServiceRoleClient } from "../supabase/index.js";
import {
  AuthenticationError,
  ConflictError,
  InternalAuthError,
} from "../errors/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { authLogger } from "../observability/logger.js";

// Enrollment

// Begins TOTP enrollment. Returns the QR URI and manual secret for display.
// Throws ConflictError if the user already has a verified factor.
export async function enrollMfaFactor(
  accessToken: string,
  input: MfaEnrollRequest,
): Promise<MfaEnrollResult> {
  const supabase = createServerClient(accessToken);

  // Guard: prevent duplicate enrollment.
  const { data: listData } = await supabase.auth.mfa.listFactors();
  const hasVerified = (listData?.totp ?? []).some((f) => f.status === "verified");
  if (hasVerified) {
    throw new ConflictError("MFA is already enrolled. Revoke the existing factor before re-enrolling.");
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: input.friendlyName,
  });

  if (error || !data) {
    authLogger.error("MFA enroll failed", { error: error?.message });
    throw new InternalAuthError(new Error(error?.message ?? "MFA enroll failed."));
  }

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    event: "auth.mfa.enrolled",
  });

  return {
    factorId: data.id,
    totpUri: data.totp.uri,
    totpSecret: data.totp.secret,
  };
}

// ---------------------------------------------------------------------------
// Challenge
// ---------------------------------------------------------------------------

// Creates a new MFA challenge for an enrolled factor.
// The returned challengeId must be supplied to verifyMfaChallenge.
export async function createMfaChallenge(
  accessToken: string,
  input: MfaChallengeRequest,
): Promise<MfaChallengeResult> {
  const supabase = createServerClient(accessToken);

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: input.factorId,
  });

  if (error || !data) {
    authLogger.warn("MFA challenge creation failed", { error: error?.message });
    throw new AuthenticationError(
      "Failed to create MFA challenge. Ensure the factor is verified.",
      "TOKEN_INVALID",
    );
  }

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    event: "auth.mfa.challenge.created",
  });

  return {
    challengeId: data.id,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

// Verifies a TOTP code against an open challenge.
// On success, the Supabase session AMR is upgraded to aal2.
// Throws AuthenticationError on wrong code or expired challenge.
export async function verifyMfaChallenge(
  accessToken: string,
  input: MfaVerifyRequest,
): Promise<MfaVerifyResult> {
  const supabase = createServerClient(accessToken);

  const { data, error } = await supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: input.challengeId,
    code: input.code,
  });

  if (error || !data) {
    authLogger.warn("MFA verify failed", { error: error?.message });
    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      event: "auth.mfa.challenge.failed",
    });
    throw new AuthenticationError("MFA code is incorrect or challenge has expired.", "TOKEN_INVALID");
  }

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    event: "auth.mfa.challenge.verified",
  });

  // Supabase returns a new session with the elevated aal2 token.
  return {
    verified: true,
    accessToken: data.access_token,
  };
}

// ---------------------------------------------------------------------------
// Factor management
// ---------------------------------------------------------------------------

// Unenrolls an MFA factor and forces re-auth for all active sessions.
// Throws AuthenticationError if the factor cannot be found.
export async function revokeMfaFactor(
  accessToken: string,
  input: MfaRevokeRequest,
): Promise<MfaRevokeResult> {
  const supabase = createServerClient(accessToken);

  const { error } = await supabase.auth.mfa.unenroll({
    factorId: input.factorId,
  });

  if (error) {
    authLogger.error("MFA factor revoke failed", { factorId: input.factorId, error: error.message });
    throw new AuthenticationError("Failed to revoke MFA factor. It may not exist.", "TOKEN_INVALID");
  }

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    event: "auth.mfa.factor.revoked",
  });

  return { revoked: true };
}

// Lists all enrolled MFA factors for the authenticated user.
export async function listMfaFactors(accessToken: string): Promise<MfaFactor[]> {
  const supabase = createServerClient(accessToken);

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    authLogger.error("Failed to list MFA factors", { error: error.message });
    throw new InternalAuthError(new Error(error.message));
  }

  return (data?.totp ?? []).map((f) => ({
    factorId: f.id,
    type: "totp" as const,
    status: f.status as "unverified" | "verified",
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Shared TOTP factor check
// ---------------------------------------------------------------------------

export async function hasVerifiedTotpFactor(userId: string): Promise<boolean> {
  const adminClient = createServiceRoleClient();
  const { data: factors, error } = await adminClient.auth.admin.mfa.listFactors({ userId });
  if (error) {
    authLogger.warn("Could not verify MFA factors", { userId, error });
    return false;
  }
  return (factors?.factors ?? []).some(
    (f: { factor_type: string; status: string }) => f.factor_type === "totp" && f.status === "verified"
  );
}
