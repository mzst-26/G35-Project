import { BaseApiError } from "../base-api-error.js";

export class InternalError extends BaseApiError {
  constructor(
    message = "An unexpected error occurred. Please try again.",
    cause?: unknown,
  ) {
    super("INTERNAL_ERROR", message, 500, cause);
  }
}
