import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@infra/shared-errors";
import { createApp } from "../../src/app.js";
import { JobStatus } from "../../src/domain/jobs/jobs.types.js";
import { AvailabilityVersionConflictError } from "../../src/errors/index.js";
import type { IdempotencyRepository } from "../../src/repositories/idempotency.repository.js";
import { buildAvailability } from "../factories/availability.factory.js";
import { createMockCalendarRepository } from "../helpers/mockCalendar.js";
import { createMockIdempotencyRepository } from "../helpers/mockJobs.js";

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

    const { app } = await createApp({ calendarRepository });

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

    const { app } = await createApp({ calendarRepository });

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

    const { app } = await createApp({ calendarRepository });

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

    const { app } = await createApp({ calendarRepository });

    const res = await request(app)
      .patch(`/api/v1/calendar/${availability.workerId}/availability/${availability.id}`)
      .set("Authorization", "Bearer t")
      .send({ date: "2026-04-10T00:00:00.000Z", startTime: "08:00", endTime: "17:00", version: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("AVAILABILITY_VERSION_CONFLICT");
  });

  it("returns cached create response when idempotency-key is reused", async () => {
    const availability = buildAvailability();
    const calendarRepository = createMockCalendarRepository({
      createAvailability: vi.fn().mockResolvedValue(availability),
    });
    const idem = createMockIdempotencyRepository();

    const { app } = await createApp({
      calendarRepository,
      idempotencyRepository: idem as unknown as IdempotencyRepository,
    });

    const key = "00000000-0000-4000-8000-000000000777";
    const body = { date: "2026-04-10T00:00:00.000Z", startTime: "08:00", endTime: "17:00", recurring: false };

    const first = await request(app)
      .post(`/api/v1/calendar/${availability.workerId}/availability`)
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", key)
      .send(body);

    expect(first.status).toBe(201);
    expect(calendarRepository.createAvailability).toHaveBeenCalledTimes(1);

    vi.mocked(idem.find).mockResolvedValueOnce({ statusCode: 201, responseBody: first.body });

    const second = await request(app)
      .post(`/api/v1/calendar/${availability.workerId}/availability`)
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", key)
      .send(body);

    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(calendarRepository.createAvailability).toHaveBeenCalledTimes(1);
  });

  it("returns 409 on idempotency-key payload conflict for create", async () => {
    const availability = buildAvailability();
    const calendarRepository = createMockCalendarRepository({
      createAvailability: vi.fn().mockResolvedValue(availability),
    });
    const idem = createMockIdempotencyRepository();
    vi.mocked(idem.find).mockRejectedValueOnce(
      new ConflictError(
        "Idempotency key has already been used with a different request payload.",
        "IDEMPOTENCY_CONFLICT",
      ),
    );

    const { app } = await createApp({
      calendarRepository,
      idempotencyRepository: idem as unknown as IdempotencyRepository,
    });

    const res = await request(app)
      .post(`/api/v1/calendar/${availability.workerId}/availability`)
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000778")
      .send({ date: "2026-04-10T00:00:00.000Z", startTime: "08:00", endTime: "17:00", recurring: false });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });
});
