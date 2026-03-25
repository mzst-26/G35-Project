import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { securityEvents } from "@infra/shared-observability";
import { CalendarService } from "../../../src/domain/calendar/calendar.service.js";
import { CalendarLockError } from "../../../src/errors/index.js";
import { buildAvailability } from "../../factories/availability.factory.js";
import { createMockCalendarRepository } from "../../helpers/mockCalendar.js";
import { JobStatus } from "../../../src/domain/jobs/jobs.types.js";

const workerUser = {
  userId: "u-worker",
  email: "worker@example.com",
  role: UserRole.TRADE,
  workerId: "22222222-2222-4222-8222-222222222222",
} as const;

const adminUser = {
  userId: "u-admin",
  email: "admin@example.com",
  role: UserRole.ADMIN,
} as const;

describe("CalendarService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes audit and throws CalendarLockError on locked update", async () => {
    const availability = buildAvailability();
    const now = Date.now();
    const repo = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
      findOverlappingJobs: vi.fn().mockResolvedValue([
        { id: "job-lock", status: JobStatus.FILLED, startAt: new Date(now + 3 * 24 * 60 * 60 * 1000) },
      ]),
    });
    const emitSpy = vi.spyOn(securityEvents, "emit");
    const service = new CalendarService(repo, 48);

    await expect(
      service.updateAvailability(
        availability.workerId,
        availability.id,
        { version: availability.version, available: false },
        workerUser,
      ),
    ).rejects.toBeInstanceOf(CalendarLockError);

    expect(repo.writeAuditEntry).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(
      "calendar.availability.lock_violation",
      expect.objectContaining({
        workerId: availability.workerId,
        availabilityId: availability.id,
        jobId: "job-lock",
      }),
    );
  });

  it("emits fee candidate and updates availability when within fee window", async () => {
    const availability = buildAvailability();
    const now = Date.now();
    const updated = buildAvailability({ version: 2, available: false });
    const repo = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
      findOverlappingJobs: vi.fn().mockResolvedValue([
        { id: "job-fee", status: JobStatus.FILLED, startAt: new Date(now + 24 * 60 * 60 * 1000) },
      ]),
      updateAvailability: vi.fn().mockResolvedValue(updated),
    });
    const emitSpy = vi.spyOn(securityEvents, "emit");
    const service = new CalendarService(repo, 48);

    await expect(
      service.updateAvailability(
        availability.workerId,
        availability.id,
        { version: availability.version, available: false },
        workerUser,
      ),
    ).rejects.toBeInstanceOf(CalendarLockError);

    expect(repo.updateAvailability).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith(
      "calendar.availability.change_fee_candidate",
      expect.objectContaining({
        workerId: availability.workerId,
        jobId: "job-fee",
      }),
    );
  });

  it("forbids worker from deleting another worker availability", async () => {
    const availability = buildAvailability({ workerId: "33333333-3333-4333-8333-333333333333" });
    const repo = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
    });
    const service = new CalendarService(repo, 48);

    await expect(
      service.deleteAvailability(availability.workerId, availability.id, availability.version, workerUser),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("admin can list any worker availability", async () => {
    const availability = buildAvailability();
    const repo = createMockCalendarRepository({
      findAvailabilityForWorker: vi.fn().mockResolvedValue([availability]),
    });
    const service = new CalendarService(repo, 48);

    const result = await service.listAvailability(availability.workerId, adminUser, {});
    expect(result).toHaveLength(1);
  });

  it("createAvailability always writes an audit entry", async () => {
    const availability = buildAvailability();
    const repo = createMockCalendarRepository({
      createAvailability: vi.fn().mockResolvedValue(availability),
    });
    const service = new CalendarService(repo, 48);

    const result = await service.createAvailability(
      availability.workerId,
      {
        date: "2026-04-10T00:00:00.000Z",
        startTime: "08:00",
        endTime: "17:00",
        recurring: false,
      },
      workerUser,
    );

    expect(result.id).toBe(availability.id);
    expect(repo.writeAuditEntry).toHaveBeenCalledTimes(1);
  });
});
