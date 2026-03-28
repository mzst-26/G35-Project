import { BaseApiError } from "../base-api-error.js";

export class ForbiddenError extends BaseApiError {
  constructor(message = "Access denied.", code = "FORBIDDEN", cause?: unknown) {
    super(code, message, 403, cause);
  }
}
