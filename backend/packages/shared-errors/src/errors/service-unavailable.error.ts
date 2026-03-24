import { BaseApiError } from "../base-api-error.js";

export class ServiceUnavailableError extends BaseApiError {
  constructor(message = "Service temporarily unavailable.", cause?: unknown) {
    super("SERVICE_UNAVAILABLE", message, 503, cause);
  }
}
