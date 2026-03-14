/**
 * Structured security event emitter.
 *
 * All auth and security events must be emitted through this module —
 * not logged directly with `logger.info(...)` in route handlers or services.
 * This ensures a consistent event taxonomy, safe PII handling, and
 * co-located Sentry breadcrumb creation.
 *
 * Usage pattern:
 *   import { emitSecurityEvent } from "../observability/events.js";
 *   emitSecurityEvent({ event: "auth.otp.requested", ... });
 *
 * The emitter:
 *  1. Redacts PII fields before writing to Winston.
 *  2. Creates a Sentry breadcrumb for audit trail continuity.
 *  3. Forwards high-severity events to Sentry as captured messages.
 */

import type { SecurityEvent } from "../types/index.js";
import { authLogger } from "./logger.js";
import { addSentryBreadcrumb, captureSentrySecurityEvent } from "./sentry.js";
import { createServiceRoleClient } from "../supabase/index.js";

// ---------------------------------------------------------------------------
// Severity classification
// ---------------------------------------------------------------------------

/**
 * Security event names that should be forwarded to Sentry as explicit
 * captures (not just breadcrumbs) because they indicate active threats
 * or critical failures requiring immediate attention.
 */
const HIGH_SEVERITY_EVENTS = new Set([
  "auth.security.brute_force_detected",
  "auth.security.token_replay_detected",
  "auth.security.csrf_violation",
  "auth.security.anomalous_session",
  "auth.mfa.challenge.failed",
  "auth.mfa.stepup.failed",
]);

// ---------------------------------------------------------------------------
// Emitter
// ---------------------------------------------------------------------------

/**
 * Emits a typed security event to all configured sinks (Winston + Sentry).
 */
export function emitSecurityEvent(event: SecurityEvent): void {
  // 1. Redact PII before writing to logger
  const safeEvent = redactPii(event);

  // 2. Write structured log entry
  authLogger.info(`security_event: ${event.event}`, { securityEvent: safeEvent });

  // 3. Always add a Sentry breadcrumb for request trace continuity
  addSentryBreadcrumb({
    category: "auth",
    message: event.event,
    level: HIGH_SEVERITY_EVENTS.has(event.event) ? "warning" : "info",
    data: { eventId: event.eventId, requestId: event.requestId },
  });

  // 4. Forward high-severity events to Sentry as explicit captures
  if (HIGH_SEVERITY_EVENTS.has(event.event)) {
    captureSentrySecurityEvent(event);
  }

  // 5. Persist to audit_logs — fire-and-forget, must never block the request.
  //    The catch here is intentional: audit write failures are non-fatal.
  writeAuditLog(event, safeEvent).catch((err) => {
    authLogger.warn("audit_log write failed", { eventId: event.eventId, err });
  });
}

// Persists a security event to the Supabase `audit_logs` table.
// The `metadata` column captures the full safe (redacted) event payload.
async function writeAuditLog(
  original: SecurityEvent,
  safe: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("audit_logs").insert({
    event_id: original.eventId,
    request_id: original.requestId,
    event_name: original.event,
    user_id: original.userId ?? null,
    role: original.role ?? null,
    ip_subnet: safe.ipAddress ?? null,
    occurred_at: original.occurredAt,
    metadata: safe,
  });

  // 42P01 = table does not exist — expected before migration runs.
  // Any other error is worth knowing about.
  if (error && error.code !== "42P01") {
    authLogger.warn("audit_log insert error", { code: error.code, message: error.message });
  }
}

// ---------------------------------------------------------------------------
// PII redaction
// ---------------------------------------------------------------------------

/**
 * Returns a copy of the event with sensitive fields replaced by safe proxies.
 *
 * Rules:
 *  - `ipAddress` → replaced with a truncated /24 subnet string (e.g., "1.2.3.x")
 *    to preserve geographic context without logging individual IPs.
 *  - Raw emails are never present in events (callers should pass `emailHash`).
 *  - No other redaction is needed at this layer — all other fields are IDs.
 */
function redactPii(event: SecurityEvent): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...event };

  if (typeof copy.ipAddress === "string") {
    copy.ipAddress = truncateIpAddress(copy.ipAddress);
  }

  return copy;
}

/**
 * Truncates an IPv4 address to /24 and IPv6 to /48 to retain coarse locality
 * while removing host-level identifiers.
 */
function truncateIpAddress(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 canonicalization for redaction.
    const expanded = expandIpv6(ip);
    if (!expanded) return "xxxx:xxxx:xxxx::";
    return `${expanded.slice(0, 3).join(":")}:xxxx:xxxx:xxxx:xxxx:xxxx`;
  }
  // IPv4 — replace last octet
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }
  return "x.x.x.x";
}

function expandIpv6(ip: string): string[] | null {
  const [head, tail] = ip.split("::");
  if (tail !== undefined && ip.indexOf("::") !== ip.lastIndexOf("::")) {
    return null;
  }

  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];

  if (headParts.some((p) => !/^[0-9a-fA-F]{1,4}$/.test(p))) return null;
  if (tailParts.some((p) => !/^[0-9a-fA-F]{1,4}$/.test(p))) return null;

  const missing = 8 - (headParts.length + tailParts.length);
  if (missing < 0) return null;

  const expanded = [
    ...headParts,
    ...Array.from({ length: missing }, () => "0"),
    ...tailParts,
  ].map((p) => p.padStart(4, "0").toLowerCase());

  return expanded.length === 8 ? expanded : null;
}
