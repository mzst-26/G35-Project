import { vi } from "vitest";
import type { JobsRepository } from "../../src/repositories/jobs.repository.js";
import type { IdempotencyRepository } from "../../src/repositories/idempotency.repository.js";

export function createMockJobsRepository(overrides: Partial<JobsRepository> = {}): JobsRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    create: vi.fn(),
    update: vi.fn(),
    transitionStatus: vi.fn(),
    findStatusHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function createMockIdempotencyRepository(): Pick<IdempotencyRepository, "find" | "save"> {
  return {
    find: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  };
}
