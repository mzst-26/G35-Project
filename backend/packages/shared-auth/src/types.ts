// Verified identity attached to every authenticated request in core-platform.
// Populated by the authenticate middleware after calling Identity's /api/internal/token/verify.

import type { UserRole } from "@infra/shared-permissions";

export interface AuthenticatedUser {
  /** Supabase user UUID — primary identity key across all services. */
  readonly userId: string;
  /** User's email — redact in logs, never include in Sentry payloads. */
  readonly email: string;
  /** Platform role from token app_metadata. */
  readonly role: UserRole;
  /** Company UUID — present for recruiter accounts. */
  readonly companyId?: string;
  /** Worker UUID — present for trade accounts. */
  readonly workerId?: string;
  /** Whether the current session has passed a step-up MFA challenge. */
  readonly stepUpVerified?: boolean;
  /** Unix timestamp (seconds) when the access token expires. */
  readonly expiresAt?: number;
}
