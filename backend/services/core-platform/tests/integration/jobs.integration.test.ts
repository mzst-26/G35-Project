import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type { IdempotencyRepository } from "../../src/repositories/idempotency.repository.js";
import { createMockIdempotencyRepository, createMockJobsRepository } from "../helpers/mockJobs.js";

vi.mock("@infra/shared-auth", async () => {
  const actual = await vi.importActual<typeof import("@infra/shared-auth")>("@infra/shared-auth");
  return {
    ...actual,
    verifyToken: vi.fn().mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
      role: "admin",
    }),
  };
});

describe("GET /api/v1/jobs", () => {
  it("returns 200 for authenticated admin request", async () => {
    const jobsRepository = createMockJobsRepository({
      findMany: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    });
    const idempotencyRepository = createMockIdempotencyRepository() as unknown as IdempotencyRepository;
    const { app } = await createApp({ jobsRepository, idempotencyRepository });
    const response = await request(app)
      .get("/api/v1/jobs")
      .set("Authorization", "Bearer good.token");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
  });
});
