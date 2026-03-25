import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { JobStatus } from "../../src/domain/jobs/jobs.types.js";
import { JobVersionConflictError } from "../../src/errors/index.js";
import { ConflictError } from "@infra/shared-errors";
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

const idem = () => createMockIdempotencyRepository() as unknown as IdempotencyRepository;

describe("POST /api/v1/jobs/:id/status", () => {
  const jobId = "00000000-0000-4000-8000-000000000001";

  beforeEach(() => {
    verifyTokenMock.mockResolvedValue({
      userId: "r1",
      email: "rec@example.com",
      role: "recruiter",
      companyId: "00000000-0000-4000-8000-000000000010",
    });
  });

  it("returns 200 with updated job on valid transition", async () => {
    const before = buildJob({ id: jobId, status: JobStatus.DRAFT, version: 1 });
    const after = buildJob({ id: jobId, status: JobStatus.OPEN, version: 2 });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(before),
      transitionStatus: vi.fn().mockResolvedValue(after),
    });
    const app = await createApp({ jobsRepository, idempotencyRepository: idem() });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .send({ status: JobStatus.OPEN, version: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(JobStatus.OPEN);
    expect(res.body.data.version).toBe(2);
  });

  it("returns cached status transition response when idempotency-key is reused", async () => {
    const before = buildJob({ id: jobId, status: JobStatus.DRAFT, version: 1 });
    const after = buildJob({ id: jobId, status: JobStatus.OPEN, version: 2 });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(before),
      transitionStatus: vi.fn().mockResolvedValue(after),
    });
    const idemRepo = createMockIdempotencyRepository();
    const app = await createApp({
      jobsRepository,
      idempotencyRepository: idemRepo as unknown as IdempotencyRepository,
    });

    const key = "00000000-0000-4000-8000-000000000222";
    const res1 = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", key)
      .send({ status: JobStatus.OPEN, version: 1 });

    expect(res1.status).toBe(200);
    expect(jobsRepository.transitionStatus).toHaveBeenCalledTimes(1);

    vi.mocked(idemRepo.find).mockResolvedValueOnce({
      statusCode: 200,
      responseBody: res1.body,
    });

    const res2 = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", key)
      .send({ status: JobStatus.OPEN, version: 1 });

    expect(res2.status).toBe(200);
    expect(res2.body).toEqual(res1.body);
    expect(jobsRepository.transitionStatus).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when idempotency-key is reused with different payload", async () => {
    const before = buildJob({ id: jobId, status: JobStatus.DRAFT, version: 1 });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(before),
    });
    const idemRepo = createMockIdempotencyRepository();
    vi.mocked(idemRepo.find).mockRejectedValueOnce(
      new ConflictError(
        "Idempotency key has already been used with a different request payload.",
        "IDEMPOTENCY_CONFLICT",
      ),
    );
    const app = await createApp({
      jobsRepository,
      idempotencyRepository: idemRepo as unknown as IdempotencyRepository,
    });

    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000222")
      .send({ status: JobStatus.OPEN, version: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("returns 422 on invalid transition", async () => {
    const job = buildJob({ id: jobId, status: JobStatus.DRAFT, version: 1 });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(job),
    });
    const app = await createApp({ jobsRepository, idempotencyRepository: idem() });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .send({ status: JobStatus.COMPLETED, version: 1 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("returns 409 on stale version", async () => {
    const job = buildJob({ id: jobId, status: JobStatus.DRAFT, version: 1 });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(job),
      transitionStatus: vi.fn().mockRejectedValue(new JobVersionConflictError()),
    });
    const app = await createApp({ jobsRepository, idempotencyRepository: idem() });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .send({ status: JobStatus.OPEN, version: 99 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JOB_VERSION_CONFLICT");
  });

  it("returns 403 when role cannot transition", async () => {
    verifyTokenMock.mockResolvedValue({
      userId: "t1",
      email: "trade@example.com",
      role: "trade",
      workerId: "00000000-0000-4000-8000-000000000099",
    });
    const app = await createApp({
      jobsRepository: createMockJobsRepository(),
      idempotencyRepository: idem(),
    });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .send({ status: JobStatus.OPEN, version: 1 });
    expect(res.status).toBe(403);
  });

  it("returns 403 when recruiter targets another company job", async () => {
    const job = buildJob({
      id: jobId,
      companyId: "00000000-0000-4000-8000-000000009999",
      status: JobStatus.DRAFT,
    });
    const jobsRepository = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(job),
    });
    const app = await createApp({ jobsRepository, idempotencyRepository: idem() });
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set("Authorization", "Bearer t")
      .send({ status: JobStatus.OPEN, version: 1 });
    expect(res.status).toBe(403);
  });
});
