// Typed error classes for the identity service.
// Use instanceof checks in error handlers and tests for reliable branching.
// HTTP status codes and error codes are co-located with the error type.

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export abstract class BaseAuthError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain broken by TypeScript Error subclassing.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Returns a client-safe JSON shape — no stack trace.
  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

// ---------------------------------------------------------------------------
// 400 — Validation
// ---------------------------------------------------------------------------

// Throws when request input fails Zod validation. HTTP 400.
export class ValidationError extends BaseAuthError {
  readonly statusCode = 400 as const;
  readonly code = "VALIDATION_ERROR" as const;

  // Field-level validation issues from Zod.
  readonly issues: ReadonlyArray<{ field: string; message: string }>;

  constructor(
    message: string,
    issues: ReadonlyArray<{ field: string; message: string }> = [],
  ) {
    super(message);
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
  readonly statusCode = 401 as const;
  readonly code: string;

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
      | "MFA_ENROLLMENT_REQUIRED" = "TOKEN_INVALID",
  ) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// 403 — Forbidden (authenticated but not authorised)
// ---------------------------------------------------------------------------

// Throws when the user is authenticated but lacks the required permission. HTTP 403.
export class ForbiddenError extends BaseAuthError {
  readonly statusCode = 403 as const;
  readonly code = "FORBIDDEN" as const;

  readonly requiredPermission?: string;

  constructor(message: string, requiredPermission?: string) {
    super(message);
    this.requiredPermission = requiredPermission;
  }
}

// ---------------------------------------------------------------------------
// 403 — Step-up MFA required
// ---------------------------------------------------------------------------

// Throws when a step-up MFA challenge is needed. HTTP 403 with challengeUrl hint.
export class MfaRequiredError extends BaseAuthError {
  readonly statusCode = 403 as const;
  readonly code = "MFA_REQUIRED" as const;

  // The endpoint the client should redirect to for the MFA challenge.
  readonly challengeUrl: string;

  constructor(challengeUrl: string) {
    super("This action requires multi-factor authentication. Please complete the MFA challenge.");
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
  readonly statusCode = 409 as const;
  readonly code = "CONFLICT" as const;
}

// ---------------------------------------------------------------------------
// 429 — Rate limited
// ---------------------------------------------------------------------------

// Throws when the client exceeds the allowed request rate. HTTP 429.
export class RateLimitError extends BaseAuthError {
  readonly statusCode = 429 as const;
  readonly code = "RATE_LIMITED" as const;

  // Unix timestamp (seconds) when the client may retry.
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Too many requests. Please try again later.");
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
  readonly statusCode = 500 as const;
  readonly code = "INTERNAL_ERROR" as const;

  constructor(cause?: unknown) {
    super("An unexpected authentication error occurred. Please try again.");
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
