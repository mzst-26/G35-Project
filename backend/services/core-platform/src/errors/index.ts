import { BaseApiError } from "@infra/shared-errors";

export { InvalidStatusTransitionError } from "@infra/shared-errors";

export class JobVersionConflictError extends BaseApiError {
  constructor() {
    super(
      "JOB_VERSION_CONFLICT",
      "Job was modified by another request. Refresh and retry.",
      409,
    );
  }
}

export class JobNotFoundError extends BaseApiError {
  constructor(id: string) {
    super("JOB_NOT_FOUND", `Job ${id} not found`, 404);
  }
}

export class CompanyNotFoundError extends BaseApiError {
  constructor(id: string) {
    super("COMPANY_NOT_FOUND", `Company ${id} not found`, 404);
  }
}

export class WorkerNotFoundError extends BaseApiError {
  constructor(id: string) {
    super("WORKER_NOT_FOUND", `Worker ${id} not found`, 404);
  }
}

export class CalendarLockError extends BaseApiError {
  constructor(jobId: string) {
    super(
      "CALENDAR_LOCK_VIOLATION",
      `Cannot modify availability: a committed job (${jobId}) starts within 7 days`,
      422,
    );
  }
}

export class AvailabilityNotFoundError extends BaseApiError {
  constructor(id: string) {
    super("AVAILABILITY_NOT_FOUND", `Availability ${id} not found`, 404);
  }
}

export class AvailabilityVersionConflictError extends BaseApiError {
  constructor() {
    super(
      "AVAILABILITY_VERSION_CONFLICT",
      "Availability was modified by another request. Refresh and retry.",
      409,
    );
  }
}
