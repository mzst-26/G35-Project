import { BaseApiError } from "../base-api-error.js";

export class BadRequestError extends BaseApiError {
  constructor(message = "Bad request.", code = "BAD_REQUEST", cause?: unknown) {
    super(code, message, 400, cause);
  }
}

// Thrown when Zod schema validation fails. Includes field-level issues.
export class ValidationError extends BaseApiError {
  readonly issues: ReadonlyArray<{ field: string; message: string }>;

  constructor(
    message = "Validation failed.",
    issues: ReadonlyArray<{ field: string; message: string }> = [],
    cause?: unknown,
  ) {
    super("VALIDATION_ERROR", message, 400, cause);
    this.issues = issues;
  }

  override toJSON() {
    return { ...super.toJSON(), issues: this.issues };
  }
}
