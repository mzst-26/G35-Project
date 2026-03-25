import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@infra/shared-errors";
import { WorkerService } from "../../../src/domain/worker/worker.service.js";
import { WorkerNotFoundError } from "../../../src/errors/index.js";
import { buildWorker, createMockWorkerRepository } from "../../helpers/mockPhase57.js";

describe("WorkerService", () => {
  it("allows worker to read own profile", async () => {
    const worker = buildWorker();
    const repo = createMockWorkerRepository({
      findById: vi.fn().mockResolvedValue(worker),
    });
    const service = new WorkerService(repo);

    const result = await service.getWorker(worker.id, {
      userId: "u1",
      email: "worker@example.com",
      role: "trade",
      workerId: worker.id,
    });

    expect(result.id).toBe(worker.id);
  });

  it("denies worker updating another profile", async () => {
    const worker = buildWorker();
    const repo = createMockWorkerRepository({
      findById: vi.fn().mockResolvedValue(worker),
    });
    const service = new WorkerService(repo);

    await expect(
      service.updateWorkerProfile(
        worker.id,
        { city: "Leeds" },
        {
          userId: "u1",
          email: "worker@example.com",
          role: "trade",
          workerId: "00000000-0000-4000-8000-000000000999",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies worker setting verification status", async () => {
    const worker = buildWorker();
    const repo = createMockWorkerRepository({
      findById: vi.fn().mockResolvedValue(worker),
    });
    const service = new WorkerService(repo);

    await expect(
      service.updateWorkerProfile(
        worker.id,
        { verifiedStatus: "verified" },
        {
          userId: "u1",
          email: "worker@example.com",
          role: "trade",
          workerId: worker.id,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws not found for missing worker", async () => {
    const repo = createMockWorkerRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new WorkerService(repo);

    await expect(
      service.getWorker("00000000-0000-4000-8000-000000000701", {
        userId: "u1",
        email: "admin@example.com",
        role: "admin",
      }),
    ).rejects.toBeInstanceOf(WorkerNotFoundError);
  });
});
