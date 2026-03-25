import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
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

describe("calendar ownership", () => {
  const workerA = "22222222-2222-4222-8222-222222222222";
  const workerB = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    verifyTokenMock.mockResolvedValue({
      userId: "trade-a",
      email: "trade@example.com",
      role: "trade",
      workerId: workerA,
    });
  });

  it("worker A cannot read worker B calendar", async () => {
    const app = await createApp({ calendarRepository: createMockCalendarRepository() });

    const res = await request(app)
      .get(`/api/v1/calendar/${workerB}`)
      .set("Authorization", "Bearer t");

    expect(res.status).toBe(403);
  });

  it("worker A cannot write worker B calendar", async () => {
    const app = await createApp({ calendarRepository: createMockCalendarRepository() });

    const res = await request(app)
      .post(`/api/v1/calendar/${workerB}/availability`)
      .set("Authorization", "Bearer t")
      .send({ date: "2026-04-10T00:00:00.000Z", startTime: "08:00", endTime: "17:00", recurring: false });

    expect(res.status).toBe(403);
  });

  it("admin can read any worker calendar", async () => {
    verifyTokenMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@example.com",
      role: "admin",
    });

    const availability = buildAvailability({ workerId: workerB });
    const app = await createApp({
      calendarRepository: createMockCalendarRepository({
        findAvailabilityForWorker: vi.fn().mockResolvedValue([availability]),
      }),
    });

    const res = await request(app)
      .get(`/api/v1/calendar/${workerB}`)
      .set("Authorization", "Bearer t");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
