// Session lifecycle service.
//
// Manages token validation, rotation, and revocation using Supabase Auth.
//
// Token TTL policy (configured in Supabase dashboard):
//   Access token: 15 minutes
//   Refresh token: 7 days (absolute), 8 hours idle enforced below
//
// All session mutations write to auth_sessions for revocation and audit.
// If the table does not exist yet (42P01, before migration runs), operations
// fall back gracefully — validates via JWT alone, revocation fails silently.

import crypto from "node:crypto";
import type {
  Session,
  SessionRefreshRequest,
  SessionRefreshResult,
  LogoutRequest,
  TokenValidationResult,
  AuthenticatedUser,
} from "../types/index.js";
import type { UserRole } from "../types/role.types.js";
import { createAnonClient, createServiceRoleClient } from "../supabase/index.js";
import { AuthenticationError, InternalAuthError } from "../errors/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { authLogger } from "../observability/logger.js";

const VALID_ROLES = new Set<UserRole>(["admin", "recruiter", "trade"]);

// Decode the JWT payload without network verification.
// We only call this AFTER Supabase has already verified the token signature
// via auth.getUser(), so we're just reading pre-verified claims cheaply.
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

// Verifies an access token — checks signature and expiry via Supabase,
// then confirms the session hasn't been revoked in auth_sessions.
// Returns a discriminated union so callers can branch without try/catch.
export async function validateToken(accessToken: string): Promise<TokenValidationResult> {
  if (!accessToken) {
    return { valid: false, error: "token_missing" };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      const msg = error?.message ?? "";
      if (msg.includes("expired") || msg.includes("exp")) {
        return { valid: false, error: "token_expired" };
      }
      return { valid: false, error: "token_invalid" };
    }

    const sbUser = data.user;
    const rawRole = sbUser.app_metadata?.role as string | undefined;

    if (!rawRole) return { valid: false, error: "role_claim_missing" };
    if (!VALID_ROLES.has(rawRole as UserRole)) return { valid: false, error: "role_not_recognised" };

    const role = rawRole as UserRole;

    // aal claim is set by Supabase when the user completes an MFA challenge.
    const jwtPayload = decodeJwtPayload(accessToken);
    const stepUpVerified = jwtPayload["aal"] === "aal2";

    // Check session revocation in auth_sessions table.
    // If session_id is present in the JWT (Supabase always sets it) and the
    // row has revoked_at set, reject the token immediately rather than waiting
    // for natural expiry. 42P01 = table not found = migration pending, skip.
    const supabaseSessionId = typeof jwtPayload["session_id"] === "string"
      ? jwtPayload["session_id"]
      : null;

    if (supabaseSessionId) {
      const { data: sessionRow, error: dbError } = await supabase
        .from("auth_sessions")
        .select("session_id, revoked_at")
        .eq("session_id", supabaseSessionId)
        .maybeSingle();

      if (!dbError && sessionRow?.revoked_at) {
        return { valid: false, error: "session_revoked" };
      }
      // 42P01 or row not found = migration not run or session not persisted yet.
      // Fall through and trust Supabase JWT validation alone.
    }

    const user: AuthenticatedUser = {
      id: sbUser.id,
      email: sbUser.email ?? "",
      role,
      stepUpVerified,
      expiresAt: Math.floor(Date.now() / 1000) + 900, // conservative 15-min fallback
    };

    return { valid: true, user };
  } catch (err) {
    authLogger.error("Unexpected error in validateToken", { err });
    return { valid: false, error: "token_invalid" };
  }
}

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

// Writes a platform session record to auth_sessions after a successful login.
// Called from otp.service.ts — fire-and-forget from the route layer.
// Silent on 42P01 (table not yet created) — graceful until migration runs.
export async function persistSession(session: Session): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("auth_sessions").insert({
    session_id: session.sessionId,
    user_id: session.userId,
    role: session.role,
    expires_at: session.expiresAt,
    last_active_at: session.lastActiveAt,
    ip_address: session.ipAddress ?? null,
    user_agent_hash: session.userAgentHash ?? null,
  });

  if (error && error.code !== "42P01") {
    authLogger.warn("auth_sessions insert failed", { code: error.code, message: error.message });
  }
}

// Updates last_active_at for a session — called on every authenticated request.
// Skips the write if the row was updated within the last 5 minutes to avoid
// a DB write on every request.
export async function touchSessionActivity(sessionId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  // Conditional update — only writes if staleness threshold exceeded.
  await supabase
    .from("auth_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .lt("last_active_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
}

// ---------------------------------------------------------------------------
// Session refresh
// ---------------------------------------------------------------------------

// Rotates the refresh token and issues a new access + refresh token pair.
// Enforces an 8-hour idle timeout: rejects if the session hasn't been active
// within that window, revokes immediately, and throws SESSION_REVOKED.
export async function refreshSession(
  input: SessionRefreshRequest,
): Promise<SessionRefreshResult> {
  if (!input.refreshToken) {
    throw new AuthenticationError("Refresh token is missing.", "TOKEN_MISSING");
  }

  try {
    const anonClient = createAnonClient();
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: input.refreshToken,
    });

    if (error || !data.session) {
      authLogger.warn("Session refresh failed", { error: error?.message });
      if (error?.message?.includes("revoked") || error?.message?.includes("invalid")) {
        throw new AuthenticationError("Session has been revoked.", "SESSION_REVOKED");
      }
      throw new AuthenticationError("Refresh token is invalid or expired.", "TOKEN_EXPIRED");
    }

    // Enforce 8-hour idle timeout against auth_sessions.
    // 42P01 = table not yet migrated → skip, trust Supabase validity alone.
    const jwtPayload = decodeJwtPayload(data.session.access_token);
    const sessionId = typeof jwtPayload["session_id"] === "string" ? jwtPayload["session_id"] : null;
    if (sessionId) {
      const svc = createServiceRoleClient();
      const { data: sessionRow, error: dbErr } = await svc
        .from("auth_sessions")
        .select("last_active_at")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (!dbErr || dbErr.code === "42P01") {
        if (sessionRow?.last_active_at) {
          const idleMs = Date.now() - new Date(sessionRow.last_active_at as string).getTime();
          if (idleMs > 8 * 60 * 60 * 1000) {
            // Revoke before returning tokens so the caller never sees them.
            await svc.auth.admin.signOut(data.session.access_token, "global");
            await svc
              .from("auth_sessions")
              .update({ revoked_at: new Date().toISOString() })
              .eq("session_id", sessionId);
            authLogger.warn("refreshSession: idle timeout exceeded, session revoked", { sessionId });
            throw new AuthenticationError(
              "Session has been idle for too long. Please sign in again.",
              "SESSION_REVOKED",
            );
          }
        }
      }
    }

    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      event: "auth.session.refreshed",
      userId: data.session.user.id,
    });

    const expiresAt = Math.floor(Date.now() / 1000) + (data.session.expires_in ?? 900);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt,
    };
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    authLogger.error("Unexpected error during session refresh", { err });
    throw new InternalAuthError(err instanceof Error ? err : undefined);
  }
}

// ---------------------------------------------------------------------------
// Session revocation
// ---------------------------------------------------------------------------

// Revokes a session by marking revoked_at in auth_sessions and signing out
// via Supabase. The audit event is only emitted after a successful revocation.
//
// For user-initiated: signs out the current session only (scope: 'local').
// For admin/system:   signs out all sessions for the user (scope: 'global').
export async function revokeSession(
  input: LogoutRequest,
  revokedBy: "user" | "admin" | "system",
  reason?: string,
  accessToken?: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  let revoked = false;

  try {
    const scope = revokedBy === "user" ? "local" : "global";

    if (accessToken) {
      await supabase.auth.admin.signOut(accessToken, scope);

      // Mark the specific session as revoked in our table.
      const jwtPayload = decodeJwtPayload(accessToken);
      const sessionId = typeof jwtPayload["session_id"] === "string"
        ? jwtPayload["session_id"]
        : input.sessionId;

      const { error: dbError } = await supabase
        .from("auth_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("session_id", sessionId);

      if (dbError && dbError.code !== "42P01") {
        authLogger.warn("auth_sessions revoke update failed", { code: dbError.code });
      }
      revoked = true;
    } else {
      // No access token — mark all active sessions for this user as revoked.
      // This is admin-initiated revocation (ban, forced logout).
      const { error: dbError } = await supabase
        .from("auth_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", input.userId)
        .is("revoked_at", null);

      if (dbError && dbError.code !== "42P01") {
        authLogger.warn("auth_sessions bulk revoke failed", { code: dbError.code });
      } else {
        revoked = true;
      }

      authLogger.warn("revokeSession: no accessToken, revoked all sessions for user", {
        userId: input.userId,
        revokedBy,
      });
    }
  } catch (err) {
    authLogger.error("Unexpected error during session revocation", { userId: input.userId, err });
    throw new InternalAuthError(err instanceof Error ? err : undefined);
  }

  // Only emit the audit event if revocation actually happened.
  if (revoked) {
    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      event: "auth.session.revoked",
      userId: input.userId,
      sessionId: input.sessionId,
      revokedBy,
      reason,
    });
  }
}

// ---------------------------------------------------------------------------
// Platform session construction
// ---------------------------------------------------------------------------

export function buildPlatformSession(params: {
  accessToken: string;
  userId: string;
  role: string;
  ipAddress?: string | null;
  userAgentHash?: string | null;
  stepUpVerified?: boolean;
}): { session: Session; sessionId: string; expiresAt: number } {
  const jwtPayload = decodeJwtPayload(params.accessToken);
  const sessionId = typeof jwtPayload["session_id"] === "string"
    ? jwtPayload["session_id"]
    : crypto.randomUUID();

  const sbExpiresIn: number = typeof jwtPayload["exp"] === "number"
    ? jwtPayload["exp"] - Math.floor(Date.now() / 1000)
    : 900;

  const expiresAt = Math.floor(Date.now() / 1000) + sbExpiresIn;
  const now = new Date().toISOString();

  const session: Session = {
    sessionId,
    userId: params.userId,
    role: params.role as Session['role'],
    createdAt: now,
    expiresAt: new Date((expiresAt + 7 * 24 * 60 * 60 - sbExpiresIn) * 1000).toISOString(),
    lastActiveAt: now,
    stepUpVerified: params.stepUpVerified ?? false,
    ipAddress: params.ipAddress ?? null,
    userAgentHash: params.userAgentHash ?? null,
  };

  return { session, sessionId, expiresAt };
}

// ---------------------------------------------------------------------------
// Session retrieval
// ---------------------------------------------------------------------------

// Retrieves session data for a valid access token.
// Primary source: auth_sessions row keyed by JWT session_id.
// Falls back to JWT-only reconstruction if the table is absent (pre-migration).
export async function getSession(accessToken: string): Promise<Session> {
  const result = await validateToken(accessToken);

  if (!result.valid) {
    throw new AuthenticationError("Session not found or invalid.", "SESSION_NOT_FOUND");
  }

  const jwtPayload = decodeJwtPayload(accessToken);
  const supabaseSessionId = typeof jwtPayload["session_id"] === "string"
    ? jwtPayload["session_id"]
    : null;

  if (supabaseSessionId) {
    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from("auth_sessions")
      .select("session_id, user_id, role, created_at, expires_at, last_active_at, ip_address, user_agent_hash, revoked_at")
      .eq("session_id", supabaseSessionId)
      .maybeSingle();

    if (error && error.code !== "42P01") {
      authLogger.warn("auth_sessions lookup failed in getSession", { code: error.code });
    }

    if (row && !row.revoked_at) {
      return {
        sessionId: row.session_id,
        userId: row.user_id,
        role: row.role as UserRole,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastActiveAt: row.last_active_at,
        stepUpVerified: result.user.stepUpVerified,
        ipAddress: row.ip_address ?? null,
        userAgentHash: row.user_agent_hash ?? null,
      };
    }
  }

  // Pre-migration fallback: reconstruct from JWT claims alone.
  const now = new Date().toISOString();
  return {
    sessionId: supabaseSessionId ?? crypto.randomUUID(),
    userId: result.user.id,
    role: result.user.role,
    createdAt: now,
    expiresAt: new Date(result.user.expiresAt * 1000).toISOString(),
    lastActiveAt: now,
    stepUpVerified: result.user.stepUpVerified,
    ipAddress: null,
    userAgentHash: null,
  };
}

