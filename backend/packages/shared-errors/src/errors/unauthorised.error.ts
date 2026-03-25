import { BaseApiError } from "../base-api-error.js";

export class UnauthorisedError extends BaseApiError {
  constructor(message = "Authentication required.", code = "UNAUTHORISED", cause?: unknown) {
    super(code, message, 401, cause);
  }
}
