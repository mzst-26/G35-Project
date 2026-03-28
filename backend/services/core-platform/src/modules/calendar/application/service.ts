import type { AuthenticatedUser } from "@infra/shared-auth";
import { ForbiddenError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { getRequestId, securityEvents } from "@infra/shared-observability";
import { getEnv } from "../../../config/env.js";
import { AvailabilityNotFoundError, CalendarLockError } from "../../../errors/index.js";
import {
  type CalendarRepository,
  type CreateAvailabilityData,
  type UpdateAvailabilityData,
} from "../infrastructure/repository.js";
import { checkCalendarLock } from "../domain/lock.js";
import {
  type CreateAvailabilityInput,
  type DateRangeFilter,
  type UpdateAvailabilityInput,
  type WorkerAvailability,
} from "../domain/types.js";

function toDateOnly(input: string): string {
  return new Date(input).toISOString().slice(0, 10);
}

export class CalendarService {
  constructor(
    private readonly calendar: CalendarRepository,
    private readonly changeFeeWindowHours = getEnv().CHANGE_FEE_WINDOW_HOURS,
  ) {}

  async listAvailability(
    workerId: string,
    requester: AuthenticatedUser,
    filters: DateRangeFilter,
  ): Promise<WorkerAvailability[]> {
    this.assertWorkerScope(workerId, requester);
    return this.calendar.findAvailabilityForWorker(workerId, filters);
  }

  async createAvailability(
    workerId: string,
    input: CreateAvailabilityInput,
    requester: AuthenticatedUser,
  ): Promise<WorkerAvailability> {
    this.assertWorkerScope(workerId, requester);

    const createData: CreateAvailabilityData = {
      workerId,
      date: toDateOnly(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
      recurring: input.recurring,
    };

    const created = await this.calendar.createAvailability(createData);

    await this.calendar.writeAuditEntry({
      action: "create",
      actorId: requester.userId,
      workerId,
      availabilityId: created.id,
      requestId: getRequestId(),
      payload: {
        lockCheckResult: { locked: false, changeFeeCandidate: false, reason: "create" },
      },
      timestamp: new Date(),
    });

    return created;
  }

  async updateAvailability(
    workerId: string,
    availabilityId: string,
    input: UpdateAvailabilityInput,
    requester: AuthenticatedUser,
  ): Promise<WorkerAvailability> {
    this.assertWorkerScope(workerId, requester);

    const existing = await this.calendar.findAvailabilityById(availabilityId);
    if (!existing) {
      throw new AvailabilityNotFoundError(availabilityId);
    }
    if (existing.workerId !== workerId) {
      throw new ForbiddenError("You cannot modify another worker's availability.");
    }

    const availabilityDate = new Date(`${existing.date}T00:00:00.000Z`);
    const overlappingJobs = await this.calendar.findOverlappingJobs(workerId, {
      start: availabilityDate,
      end: availabilityDate,
    });

    const lockCheckResult = checkCalendarLock({
      availabilityDate,
      jobs: overlappingJobs,
      now: new Date(),
      changeFeeWindowHours: this.changeFeeWindowHours,
    });

    await this.calendar.writeAuditEntry({
      action: "update",
      actorId: requester.userId,
      workerId,
      availabilityId,
      requestId: getRequestId(),
      payload: { lockCheckResult },
      timestamp: new Date(),
    });

    if (lockCheckResult.changeFeeCandidate && lockCheckResult.lockingJobId) {
      securityEvents.emit("calendar.availability.change_fee_candidate", {
        workerId,
        jobId: lockCheckResult.lockingJobId,
        requestId: getRequestId(),
      });
    }

    if (lockCheckResult.locked) {
      securityEvents.emit("calendar.availability.lock_violation", {
        workerId,
        availabilityId,
        jobId: lockCheckResult.lockingJobId ?? "unknown",
        requestId: getRequestId(),
      });
      throw new CalendarLockError(lockCheckResult.lockingJobId ?? "unknown");
    }

    const patch: UpdateAvailabilityData = {};
    if (input.date !== undefined) patch.date = toDateOnly(input.date);
    if (input.startTime !== undefined) patch.startTime = input.startTime;
    if (input.endTime !== undefined) patch.endTime = input.endTime;
    if (input.recurring !== undefined) patch.recurring = input.recurring;
    if (input.available !== undefined) patch.available = input.available;

    return this.calendar.updateAvailability(availabilityId, patch, input.version);
  }

  async deleteAvailability(
    workerId: string,
    availabilityId: string,
    version: number,
    requester: AuthenticatedUser,
  ): Promise<void> {
    this.assertWorkerScope(workerId, requester);

    const existing = await this.calendar.findAvailabilityById(availabilityId);
    if (!existing) {
      throw new AvailabilityNotFoundError(availabilityId);
    }
    if (existing.workerId !== workerId) {
      throw new ForbiddenError("You cannot modify another worker's availability.");
    }

    const availabilityDate = new Date(`${existing.date}T00:00:00.000Z`);
    const overlappingJobs = await this.calendar.findOverlappingJobs(workerId, {
      start: availabilityDate,
      end: availabilityDate,
    });

    const lockCheckResult = checkCalendarLock({
      availabilityDate,
      jobs: overlappingJobs,
      now: new Date(),
      changeFeeWindowHours: this.changeFeeWindowHours,
    });

    await this.calendar.writeAuditEntry({
      action: "delete",
      actorId: requester.userId,
      workerId,
      availabilityId,
      requestId: getRequestId(),
      payload: { lockCheckResult },
      timestamp: new Date(),
    });

    if (lockCheckResult.changeFeeCandidate && lockCheckResult.lockingJobId) {
      securityEvents.emit("calendar.availability.change_fee_candidate", {
        workerId,
        jobId: lockCheckResult.lockingJobId,
        requestId: getRequestId(),
      });
    }

    if (lockCheckResult.locked) {
      securityEvents.emit("calendar.availability.lock_violation", {
        workerId,
        availabilityId,
        jobId: lockCheckResult.lockingJobId ?? "unknown",
        requestId: getRequestId(),
      });
      throw new CalendarLockError(lockCheckResult.lockingJobId ?? "unknown");
    }

    await this.calendar.deleteAvailability(availabilityId, version);
  }

  private assertWorkerScope(workerId: string, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }
    if (!requester.workerId || requester.workerId !== workerId) {
      throw new ForbiddenError("You can only access your own calendar.");
    }
  }
}
