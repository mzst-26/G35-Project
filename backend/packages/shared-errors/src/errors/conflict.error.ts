import { BaseApiError } from "../base-api-error.js";

export class ConflictError extends BaseApiError {
  constructor(message = "Conflict with existing resource.", code = "CONFLICT", cause?: unknown) {
    super(code, message, 409, cause);
  }
}

// Thrown when a write is rejected due to a stale version column (optimistic locking).
export class StaleVersionError extends BaseApiError {
  constructor(
    message = "Resource was modified by another request. Fetch the latest version and retry.",
  ) {
    super("STALE_VERSION", message, 409);
  }
}
