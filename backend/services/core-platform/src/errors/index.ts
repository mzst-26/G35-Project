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
