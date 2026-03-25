import { describe, expect, it, vi } from "vitest";
import { JobStatus } from "../../../src/domain/jobs/jobs.types.js";
import { SupabaseCalendarRepository } from "../../../src/repositories/calendar.repository.js";
import { AvailabilityNotFoundError, AvailabilityVersionConflictError } from "../../../src/errors/index.js";
import { ServiceUnavailableError } from "@infra/shared-errors";

function buildUpdateChain(result: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

describe("SupabaseCalendarRepository", () => {
  it("findOverlappingJobs parses date-only and timestamp fields in UTC", async () => {
    const jobsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: "job-date",
            status: JobStatus.FILLED,
            start_at: null,
            end_at: null,
            start_date: "2026-04-10",
            end_date: "2026-04-10",
          },
          {
            id: "job-ts",
            status: JobStatus.OPEN,
            start_at: "2026-04-10T06:00:00.000Z",
            end_at: "2026-04-10T12:00:00.000Z",
            start_date: null,
            end_date: null,
          },
          {
            id: "job-outside",
            status: JobStatus.FILLED,
            start_at: "2026-04-20T06:00:00.000Z",
            end_at: "2026-04-20T12:00:00.000Z",
            start_date: null,
            end_date: null,
          },
        ],
        error: null,
      }),
    };

    const client = {
      from: vi.fn().mockReturnValue(jobsChain),
    };

    const repo = new SupabaseCalendarRepository(client as never);
    const result = await repo.findOverlappingJobs("worker-1", {
      start: new Date("2026-04-10T00:00:00.000Z"),
      end: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["job-date", "job-ts"]);
    expect(result[0].startAt.toISOString()).toBe("2026-04-10T00:00:00.000Z");
  });

  it("updateAvailability throws AvailabilityVersionConflictError for stale version", async () => {
    const updateChain = buildUpdateChain({ data: null, error: null });
    const findChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "a1",
          worker_id: "w1",
          date: "2026-04-10",
          start_time: "08:00",
          end_time: "17:00",
          recurring: false,
          available: true,
          locked: false,
          original_availability: null,
          version: 2,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
        error: null,
      }),
    };

    const from = vi.fn().mockReturnValueOnce(updateChain).mockReturnValueOnce(findChain);
    const repo = new SupabaseCalendarRepository({ from } as never);

    await expect(
      repo.updateAvailability("a1", { available: false }, 1),
    ).rejects.toBeInstanceOf(AvailabilityVersionConflictError);
  });

  it("updateAvailability throws AvailabilityNotFoundError when row is missing", async () => {
    const updateChain = buildUpdateChain({ data: null, error: null });
    const findChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const from = vi.fn().mockReturnValueOnce(updateChain).mockReturnValueOnce(findChain);
    const repo = new SupabaseCalendarRepository({ from } as never);

    await expect(
      repo.updateAvailability("a1", { available: false }, 1),
    ).rejects.toBeInstanceOf(AvailabilityNotFoundError);
  });

  it("writeAuditEntry falls back to audit_logs when audit_log table is absent", async () => {
    const auditLogInsert = vi.fn().mockResolvedValue({
      error: { code: "42P01", message: 'relation "audit_log" does not exist' },
    });
    const auditLogsInsert = vi.fn().mockResolvedValue({ error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "audit_log") return { insert: auditLogInsert };
        if (table === "audit_logs") return { insert: auditLogsInsert };
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };

    const repo = new SupabaseCalendarRepository(client as never);
    await repo.writeAuditEntry({
      action: "update",
      actorId: "11111111-1111-4111-8111-111111111111",
      workerId: "22222222-2222-4222-8222-222222222222",
      availabilityId: "33333333-3333-4333-8333-333333333333",
      requestId: "req-1",
      payload: { lockCheckResult: { locked: true } },
      timestamp: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(auditLogInsert).toHaveBeenCalledTimes(1);
    expect(auditLogsInsert).toHaveBeenCalledTimes(1);
  });

  it("writeAuditEntry throws when both primary and fallback audit writes fail", async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === "audit_log") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: "42P01", message: 'relation "audit_log" does not exist' },
            }),
          };
        }

        if (table === "audit_logs") {
          return {
            insert: vi.fn().mockResolvedValue({ error: { message: "insert denied" } }),
          };
        }

        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };

    const repo = new SupabaseCalendarRepository(client as never);

    await expect(
      repo.writeAuditEntry({
        action: "delete",
        actorId: "11111111-1111-4111-8111-111111111111",
        workerId: "22222222-2222-4222-8222-222222222222",
        availabilityId: "33333333-3333-4333-8333-333333333333",
        payload: {},
        timestamp: new Date("2026-03-01T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
