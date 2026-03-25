import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import {
  allStatusPairs,
  isValidTransition,
} from "../../src/domain/jobs/jobs.fsm.js";
import { JobStatus } from "../../src/domain/jobs/jobs.types.js";
import type { IdempotencyRepository } from "../../src/repositories/idempotency.repository.js";
import { buildJob } from "../factories/job.factory.js";
import { createMockIdempotencyRepository, createMockJobsRepository } from "../helpers/mockJobs.js";

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

describe("status.transition.security", () => {
  const jobId = "00000000-0000-4000-8000-000000000001";

  beforeEach(() => {
    verifyTokenMock.mockResolvedValue({
      userId: "r1",
      email: "rec@example.com",
      role: "recruiter",
      companyId: "00000000-0000-4000-8000-000000000010",
    });
  });

  it("rejects every illegal FSM transition with 422", async () => {
    const idem = createMockIdempotencyRepository() as unknown as IdempotencyRepository;
    for (const { from, to } of allStatusPairs()) {
      if (isValidTransition(from, to)) continue;
      const job = buildJob({ id: jobId, status: from, version: 1 });
      const jobsRepository = createMockJobsRepository({
        findById: vi.fn().mockResolvedValue(job),
      });
      const { app } = await createApp({ jobsRepository, idempotencyRepository: idem });
      const res = await request(app)
        .post(`/api/v1/jobs/${jobId}/status`)
        .set("Authorization", "Bearer t")
        .send({ status: to, version: 1 });
      expect(res.status, `from=${from} to=${to}`).toBe(422);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    }
  });

  it("rejects jump to completed without in_progress (example: open -> completed)", async () => {
    const job = buildJob({ id: jobId, status: JobStatus.OPEN, version: 1 });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(job),
    });
    const { app } = await createApp({
      jobsRepository,
      idempotencyRepository: createMockIdempotencyRepository() as unknown as IdempotencyRepository,
    });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .send({ status: JobStatus.COMPLETED, version: 1 });
    expect(res.status).toBe(422);
  });

  it("returns 401 when unauthenticated (not 422)", async () => {
    verifyTokenMock.mockRejectedValueOnce(new Error("missing"));
    const { app } = await createApp({
      jobsRepository: createMockJobsRepository(),
      idempotencyRepository: createMockIdempotencyRepository() as unknown as IdempotencyRepository,
    });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .send({ status: JobStatus.OPEN, version: 1 });
    expect(res.status).toBe(401);
  });
});
