import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { JobStatus } from "../../src/domain/jobs/jobs.types.js";
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

const validBody = {
  title: "Senior electrician",
  description: "Commercial fit-out",
  startAt: "2026-05-01T08:00:00.000Z",
  endAt: "2026-05-31T18:00:00.000Z",
  salary: 400,
  currency: "GBP",
  companyId: "00000000-0000-4000-8000-000000000010",
};

describe("POST /api/v1/jobs", () => {
  beforeEach(() => {
    verifyTokenMock.mockResolvedValue({
      userId: "r1",
      email: "rec@example.com",
      role: "recruiter",
      companyId: "00000000-0000-4000-8000-000000000010",
    });
  });

  it("returns 201 with job body", async () => {
    const created = buildJob({ title: "Senior electrician" });
    const jobsRepository = createMockJobsRepository({
      create: vi.fn().mockResolvedValue(created),
    });
    const idempotencyRepository = createMockIdempotencyRepository() as unknown as IdempotencyRepository;
    const { app } = await createApp({ jobsRepository, idempotencyRepository });
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", "Bearer t")
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(created.id);
    expect(res.body.data.status).toBe(JobStatus.DRAFT);
  });

  it("returns same 201 body when idempotency-key is reused", async () => {
    const created = buildJob();
    const jobsRepository = createMockJobsRepository({
      create: vi.fn().mockResolvedValue(created),
    });
    const idem = createMockIdempotencyRepository();
    const idempotencyRepository = idem as unknown as IdempotencyRepository;
    const { app } = await createApp({ jobsRepository, idempotencyRepository });

    const res1 = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000111")
      .send(validBody);
    expect(res1.status).toBe(201);
    expect(jobsRepository.create).toHaveBeenCalledTimes(1);

    vi.mocked(idem.find).mockResolvedValueOnce({
      statusCode: 201,
      responseBody: res1.body,
    });

    const res2 = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000111")
      .send({ ...validBody, title: "ignored" });
    expect(res2.status).toBe(201);
    expect(res2.body).toEqual(res1.body);
    expect(jobsRepository.create).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when idempotency-key is reused with different payload", async () => {
    const created = buildJob();
    const jobsRepository = createMockJobsRepository({
      create: vi.fn().mockResolvedValue(created),
    });
    const idem = createMockIdempotencyRepository();
    const idempotencyRepository = idem as unknown as IdempotencyRepository;
    const { app } = await createApp({ jobsRepository, idempotencyRepository });

    vi.mocked(idem.find).mockRejectedValueOnce(
      new ConflictError(
        "Idempotency key has already been used with a different request payload.",
        "IDEMPOTENCY_CONFLICT",
      ),
    );

    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000111")
      .send({ ...validBody, title: "different" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("returns 400 when required field missing", async () => {
    const { app } = await createApp({
      jobsRepository: createMockJobsRepository(),
      idempotencyRepository: createMockIdempotencyRepository() as unknown as IdempotencyRepository,
    });
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", "Bearer t")
      .send({ title: "ab" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when idempotency-key is not a UUID", async () => {
    const { app } = await createApp({
      jobsRepository: createMockJobsRepository(),
      idempotencyRepository: createMockIdempotencyRepository() as unknown as IdempotencyRepository,
    });
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", "Bearer t")
      .set("Idempotency-Key", "not-a-uuid")
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    verifyTokenMock.mockRejectedValueOnce(new Error("bad"));
    const { app } = await createApp({
      jobsRepository: createMockJobsRepository(),
      idempotencyRepository: createMockIdempotencyRepository() as unknown as IdempotencyRepository,
    });
    const res = await request(app).post("/api/v1/jobs").send(validBody);
    expect(res.status).toBe(401);
  });
});
