import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { JobStatus } from "../../src/domain/jobs/jobs.types.js";
import { AvailabilityVersionConflictError } from "../../src/errors/index.js";
import { buildAvailability } from "../factories/availability.factory.js";
import { createMockCalendarRepository } from "../helpers/mockCalendar.js";

const { verifyTokenMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
}));

vi.mock("@infra/shared-auth", async () => {
  const actual = await vi.importActual<typeof import("@infra/shared-auth")>("@infra/shared-auth");
  return {
    ...actual,
    verifyToken: verifyTokenMock,
  };
});

describe("calendar lock integration", () => {
  const now = new Date();
  const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    verifyTokenMock.mockResolvedValue({
      userId: "u1",
      email: "trade@example.com",
      role: "trade",
      workerId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns 422 when deleting availability within 7 days of a filled job", async () => {
    const availability = buildAvailability();
    const calendarRepository = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
      findOverlappingJobs: vi.fn().mockResolvedValue([
        { id: "job-1", status: JobStatus.FILLED, startAt: inDays(3) },
      ]),
    });

    const app = await createApp({ calendarRepository });

    const res = await request(app)
      .delete(`/api/v1/calendar/${availability.workerId}/availability/${availability.id}?version=1`)
      .set("Authorization", "Bearer t");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CALENDAR_LOCK_VIOLATION");
    expect(calendarRepository.writeAuditEntry).toHaveBeenCalledTimes(1);
  });

  it("allows delete when filled job is outside lock window", async () => {
    const availability = buildAvailability();
    const calendarRepository = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
      findOverlappingJobs: vi.fn().mockResolvedValue([
        { id: "job-10-days", status: JobStatus.FILLED, startAt: inDays(10) },
      ]),
      deleteAvailability: vi.fn().mockResolvedValue(undefined),
    });

    const app = await createApp({ calendarRepository });

    const res = await request(app)
      .delete(`/api/v1/calendar/${availability.workerId}/availability/${availability.id}?version=1`)
      .set("Authorization", "Bearer t");

    expect(res.status).toBe(200);
    expect(calendarRepository.writeAuditEntry).toHaveBeenCalledTimes(1);
  });

  it("allows delete when overlapping job is open", async () => {
    const availability = buildAvailability();
    const calendarRepository = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
      findOverlappingJobs: vi.fn().mockResolvedValue([
        { id: "job-open", status: JobStatus.OPEN, startAt: inDays(3) },
      ]),
      deleteAvailability: vi.fn().mockResolvedValue(undefined),
    });

    const app = await createApp({ calendarRepository });

    const res = await request(app)
      .delete(`/api/v1/calendar/${availability.workerId}/availability/${availability.id}?version=1`)
      .set("Authorization", "Bearer t");

    expect(res.status).toBe(200);
    expect(calendarRepository.writeAuditEntry).toHaveBeenCalledTimes(1);
  });

  it("returns 409 on concurrent updates with same version", async () => {
    const availability = buildAvailability();
    const calendarRepository = createMockCalendarRepository({
      findAvailabilityById: vi.fn().mockResolvedValue(availability),
      findOverlappingJobs: vi.fn().mockResolvedValue([]),
      updateAvailability: vi.fn().mockRejectedValue(new AvailabilityVersionConflictError()),
    });

    const app = await createApp({ calendarRepository });

    const res = await request(app)
      .patch(`/api/v1/calendar/${availability.workerId}/availability/${availability.id}`)
      .set("Authorization", "Bearer t")
      .send({ date: "2026-04-10T00:00:00.000Z", startTime: "08:00", endTime: "17:00", version: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("AVAILABILITY_VERSION_CONFLICT");
  });
});
