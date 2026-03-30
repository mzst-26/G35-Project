import { describe, expect, it, vi } from "vitest";
import { InvalidStatusTransitionError, ServiceUnavailableError } from "@infra/shared-errors";
import { JobStatus } from "../../../src/domain/jobs/jobs.types.js";
import { JobNotFoundError, JobVersionConflictError } from "../../../src/errors/index.js";
import { SupabaseJobsRepository } from "../../../src/repositories/jobs.repository.js";

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    company_id: "00000000-0000-4000-8000-000000000010",
    title: "Role",
    description: null,
    start_at: "2026-04-01T09:00:00.000Z",
    end_at: "2026-04-30T17:00:00.000Z",
    salary: "100.00",
    currency: "GBP",
    status: "draft",
    assigned_worker_id: null,
    version: 1,
    created_at: "2026-03-01T12:00:00.000Z",
    updated_at: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("SupabaseJobsRepository", () => {
  it("create retries without title when jobs schema has no title column", async () => {
    const jobsChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Could not find the 'title' column of 'jobs' in the schema cache" },
        })
        .mockResolvedValueOnce({
          data: jobRow({ title: undefined, special_requirements: "Fallback title" }),
          error: null,
        }),
    };
    const tradesChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "00000000-0000-4000-8000-000000000099" },
        error: null,
      }),
    };
    const from = vi
      .fn()
      .mockImplementation((table: string) => {
        if (table === "trades") {
          return tradesChain;
        }
        return jobsChain;
      });
    const repo = new SupabaseJobsRepository({ from } as never);

    const result = await repo.create({
      companyId: "00000000-0000-4000-8000-000000000010",
      title: "Fallback title",
      description: "desc",
      startAt: "2026-04-01T09:00:00.000Z",
      endAt: "2026-04-30T17:00:00.000Z",
      salary: 150,
      currency: "GBP",
    });

    expect(jobsChain.insert).toHaveBeenCalledTimes(2);
    expect(jobsChain.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: "Fallback title",
        special_requirements: "Fallback title",
        trade_id: "00000000-0000-4000-8000-000000000099",
        workers_needed: 1,
      }),
    );
    expect(jobsChain.insert).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({ title: "Fallback title" }),
    );
    expect(result.title).toBe("Fallback title");
  });

  it("update increments version in patch payload", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: jobRow({ version: 2 }),
      error: null,
    });
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const from = vi.fn().mockReturnValue(chain);
    const repo = new SupabaseJobsRepository({ from } as never);

    const result = await repo.update(
      "00000000-0000-4000-8000-000000000001",
      { title: "Updated" },
      1,
    );

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }));
    expect(result.version).toBe(2);
  });

  it("update retries without title when jobs schema has no title column", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Could not find the 'title' column of 'jobs' in the schema cache" },
      })
      .mockResolvedValueOnce({
        data: jobRow({
          title: undefined,
          special_requirements: "Updated title",
          version: 2,
        }),
        error: null,
      });
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const from = vi.fn().mockReturnValue(chain);
    const repo = new SupabaseJobsRepository({ from } as never);

    const result = await repo.update(
      "00000000-0000-4000-8000-000000000001",
      { title: "Updated title" },
      1,
    );

    expect(chain.update).toHaveBeenCalledTimes(2);
    expect(chain.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: "Updated title", special_requirements: "Updated title" }),
    );
    expect(chain.update).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({ title: "Updated title" }),
    );
    expect(result.title).toBe("Updated title");
  });

  it("update throws JobVersionConflictError for stale version", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const findChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: jobRow(), error: null }),
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(findChain);
    const repo = new SupabaseJobsRepository({ from } as never);

    await expect(
      repo.update("00000000-0000-4000-8000-000000000001", { title: "Updated" }, 1),
    ).rejects.toBeInstanceOf(JobVersionConflictError);
  });

  it("update throws JobNotFoundError when row does not exist", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const findChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(findChain);
    const repo = new SupabaseJobsRepository({ from } as never);

    await expect(
      repo.update("00000000-0000-4000-8000-000000000001", { title: "Updated" }, 1),
    ).rejects.toBeInstanceOf(JobNotFoundError);
  });

  it("transitionStatus throws service unavailable for malformed RPC payload", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
    };
    const repo = new SupabaseJobsRepository(client as never);

    await expect(
      repo.transitionStatus(
        "00000000-0000-4000-8000-000000000001",
        JobStatus.OPEN,
        "r1",
        1,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it("transitionStatus throws invalid status transition for RPC invalid_transition", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: { ok: false, error: "invalid_transition" }, error: null }),
    };
    const repo = new SupabaseJobsRepository(client as never);

    await expect(
      repo.transitionStatus(
        "00000000-0000-4000-8000-000000000001",
        JobStatus.OPEN,
        "r1",
        1,
      ),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionError);
  });
});
