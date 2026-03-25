import { BaseApiError } from "../base-api-error.js";

export class NotFoundError extends BaseApiError {
  constructor(message = "Resource not found.", code = "NOT_FOUND", cause?: unknown) {
    super(code, message, 404, cause);
  }
}
