/**
 * Audit and security event type contracts.
 *
 * All authentication and authorisation events are described here. The
 * observability layer (Winston + Sentry) consumes these types to guarantee
 * structured, consistent, PII-safe event records across the platform.
 *
 * Design rules:
 *  - Every event includes a unique `eventId` and `requestId` for correlation.
 *  - PII (email, IP) is always optional and must be redacted before shipping
 *    to third-party log sinks (see `src/observability/logger.ts`).
 *  - Event names follow the taxonomy: `<domain>.<entity>.<action>.<outcome>`
 */

import type { UserRole } from "./role.types.js";

// ---------------------------------------------------------------------------
// Taxonomy of security event names
// ---------------------------------------------------------------------------

/**
 * Exhaustive list of security-relevant event names emitted by the platform.
 */
export type SecurityEventName =
  // OTP flow
  | "auth.otp.requested"
  | "auth.otp.verified"
  | "auth.otp.failed"
  | "auth.otp.expired"
  // MFA flow
  | "auth.mfa.enrolled"
  | "auth.mfa.challenge.created"
  | "auth.mfa.challenge.verified"
  | "auth.mfa.challenge.failed"
  | "auth.mfa.challenge.expired"
  | "auth.mfa.factor.revoked"
  | "auth.mfa.stepup.required"
  | "auth.mfa.stepup.completed"
  | "auth.mfa.stepup.failed"
  // Session lifecycle
  | "auth.session.created"
  | "auth.session.refreshed"
  | "auth.session.revoked"
  | "auth.session.expired"
  | "auth.session.invalid_token"
  // Access control
  | "auth.access.granted"
  | "auth.access.denied"
  | "auth.access.forbidden"
  // Account lifecycle
  | "auth.account.registered"
  | "auth.account.password_reset_requested"
  | "auth.account.deleted"
  | "auth.account.role_changed"
  // Suspicious activity
  | "auth.security.brute_force_detected"
  | "auth.security.token_replay_detected"
  | "auth.security.csrf_violation"
  | "auth.security.anomalous_session";

// ---------------------------------------------------------------------------
// Base event shape
// ---------------------------------------------------------------------------

/**
 * Fields common to every security event record.
 */
export interface BaseSecurityEvent {
  /** UUID generated per-event for deduplication. */
  readonly eventId: string;
  /** Inbound request ID from the `x-request-id` header for log correlation. */
  readonly requestId: string;
  /** ISO-8601 timestamp at which the event occurred. */
  readonly occurredAt: string;
  /** The event name from the taxonomy above. */
  readonly event: SecurityEventName;
  /**
   * Supabase user UUID. Present when the user is identifiable.
   * Omit on anonymous actions (e.g., OTP request before verification).
   */
  readonly userId?: string;
  /**
   * Platform role at the time of the event.
   * Omit when the role is not yet known (pre-login events).
   */
  readonly role?: UserRole;
  /**
   * IP address of the requesting client.
   * Stored short-term for rate-limit and abuse detection only.
   */
  readonly ipAddress?: string;
  /**
   * Short hash of the User-Agent header (not the raw value).
   * Used for device heuristics without exposing PII.
   */
  readonly userAgentHash?: string;
}

// ---------------------------------------------------------------------------
// Specialised event shapes
// ---------------------------------------------------------------------------

/** Emitted when an OTP request is made (before identity is confirmed). */
export interface OtpRequestedEvent extends BaseSecurityEvent {
  readonly event: "auth.otp.requested";
  /** Hashed email — NEVER log the raw email address. */
  readonly emailHash: string;
}

/** Emitted on a successful OTP → session creation. */
export interface SessionCreatedEvent extends BaseSecurityEvent {
  readonly event: "auth.session.created";
  readonly userId: string;
  readonly role: UserRole;
  readonly sessionId: string;
}

/** Emitted on explicit logout or server-side revocation. */
export interface SessionRevokedEvent extends BaseSecurityEvent {
  readonly event: "auth.session.revoked";
  readonly userId: string;
  readonly sessionId: string;
  readonly revokedBy: "user" | "admin" | "system";
  readonly reason?: string;
}

/** Emitted when an access/authorisation check is denied. */
export interface AccessDeniedEvent extends BaseSecurityEvent {
  readonly event: "auth.access.denied" | "auth.access.forbidden";
  readonly resource?: string;
  readonly action?: string;
  readonly reason: string;
}

/** Emitted when automated abuse signals are detected. */
export interface SecurityAnomalyEvent extends BaseSecurityEvent {
  readonly event:
    | "auth.security.brute_force_detected"
    | "auth.security.token_replay_detected"
    | "auth.security.csrf_violation"
    | "auth.security.anomalous_session";
  readonly detail: string;
}

/**
 * Union of all typed security events.
 *
 * The `observability/events.ts` emitter accepts only this type so that
 * all callers must provide a fully-typed record.
 */
export type SecurityEvent =
  | OtpRequestedEvent
  | SessionCreatedEvent
  | SessionRevokedEvent
  | AccessDeniedEvent
  | SecurityAnomalyEvent
  | BaseSecurityEvent;
