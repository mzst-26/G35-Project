import { BaseApiError } from "../base-api-error.js";

export class UnprocessableError extends BaseApiError {
  constructor(message = "Request cannot be processed.", code = "UNPROCESSABLE", cause?: unknown) {
    super(code, message, 422, cause);
  }
}

// Thrown when a job status transition is not in the FSM map.
export class InvalidStatusTransitionError extends BaseApiError {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition job status from '${from}' to '${to}'.`,
      422,
    );
    this.from = from;
    this.to = to;
  }
}

// Thrown when a calendar change violates the 7-day lock rule.
export class CalendarLockViolationError extends BaseApiError {
  constructor(message = "Cannot modify availability within 7 days of a scheduled job.") {
    super("CALENDAR_LOCK_VIOLATION", message, 422);
  }
}
