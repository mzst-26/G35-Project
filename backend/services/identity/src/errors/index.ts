// Typed error classes for the identity service.
// Use instanceof checks in error handlers and tests for reliable branching.
// HTTP status codes and error codes are co-located with the error type.
//
// Implementation note:
//  - BaseAuthError is rebased on @infra/shared-errors/BaseApiError so the
//    platform uses one shared error foundation while preserving identity-specific
//    subclasses and payload shapes.

import { BaseApiError } from "@infra/shared-errors";

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export abstract class BaseAuthError extends BaseApiError {
  constructor(message: string, statusCode: number, code: string, cause?: unknown) {
    super(code, message, statusCode, cause);
  }
}

// ---------------------------------------------------------------------------
// 400 — Validation
// ---------------------------------------------------------------------------

// Throws when request input fails Zod validation. HTTP 400.
export class ValidationError extends BaseAuthError {
  // Field-level validation issues from Zod.
  readonly issues: ReadonlyArray<{ field: string; message: string }>;

  constructor(
    message: string,
    issues: ReadonlyArray<{ field: string; message: string }> = [],
    cause?: unknown,
  ) {
    super(message, 400, "VALIDATION_ERROR", cause);
    this.issues = issues;
  }

  override toJSON() {
    return { ...super.toJSON(), issues: this.issues };
  }
}

// ---------------------------------------------------------------------------
// 401 — Authentication required
// ---------------------------------------------------------------------------

// Throws when credentials are missing or the token is expired. HTTP 401.
export class AuthenticationError extends BaseAuthError {
  constructor(
    message: string,
    code:
      | "TOKEN_MISSING"
      | "TOKEN_EXPIRED"
      | "TOKEN_INVALID"
      | "OTP_INVALID"
      | "OTP_EXPIRED"
      | "SESSION_NOT_FOUND"
      | "SESSION_REVOKED"
      | "ROLE_NOT_RECOGNISED"
        | "ACCOUNT_PENDING_REVIEW"
        | "ACCOUNT_REJECTED"
        | "ACCOUNT_SUSPENDED"
      | "MFA_ENROLLMENT_REQUIRED" = "TOKEN_INVALID",
    cause?: unknown,
  ) {
    super(message, 401, code, cause);
  }
}

// ---------------------------------------------------------------------------
// 403 — Forbidden (authenticated but not authorised)
// ---------------------------------------------------------------------------

// Throws when the user is authenticated but lacks the required permission. HTTP 403.
export class ForbiddenError extends BaseAuthError {
  readonly requiredPermission?: string;

  constructor(message: string, requiredPermission?: string, cause?: unknown) {
    super(message, 403, "FORBIDDEN", cause);
    this.requiredPermission = requiredPermission;
  }
}

// ---------------------------------------------------------------------------
// 403 — Step-up MFA required
// ---------------------------------------------------------------------------

// Throws when a step-up MFA challenge is needed. HTTP 403 with challengeUrl hint.
export class MfaRequiredError extends BaseAuthError {
  // The endpoint the client should redirect to for the MFA challenge.
  readonly challengeUrl: string;

  constructor(challengeUrl: string) {
    super(
      "This action requires multi-factor authentication. Please complete the MFA challenge.",
      403,
      "MFA_REQUIRED",
    );
    this.challengeUrl = challengeUrl;
  }

  override toJSON() {
    return { ...super.toJSON(), challengeUrl: this.challengeUrl };
  }
}

// ---------------------------------------------------------------------------
// 409 — Conflict (e.g., MFA factor already enrolled)
// ---------------------------------------------------------------------------

// Throws when the operation conflicts with existing state. HTTP 409.
export class ConflictError extends BaseAuthError {
  constructor(message = "The requested operation conflicts with existing state.", cause?: unknown) {
    super(message, 409, "CONFLICT", cause);
  }
}

// ---------------------------------------------------------------------------
// 429 — Rate limited
// ---------------------------------------------------------------------------

// Throws when the client exceeds the allowed request rate. HTTP 429.
export class RateLimitError extends BaseAuthError {
  // Unix timestamp (seconds) when the client may retry.
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMITED");
    this.retryAfter = retryAfter;
  }

  override toJSON() {
    return { ...super.toJSON(), retryAfter: this.retryAfter };
  }
}

// ---------------------------------------------------------------------------
// 500 — Internal / unexpected
// ---------------------------------------------------------------------------

// Throws for unexpected errors not safe to surface to clients.
// Original cause is preserved for Sentry. HTTP 500.
export class InternalAuthError extends BaseAuthError {
  constructor(cause?: unknown) {
    super("An unexpected authentication error occurred. Please try again.", 500, "INTERNAL_ERROR", cause);
  }
}
