import { describe, expect, it, vi } from "vitest";
import { InvalidStatusTransitionError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { securityEvents } from "@infra/shared-observability";
import { JobsService } from "../../../src/domain/jobs/jobs.service.js";
import { JobStatus } from "../../../src/domain/jobs/jobs.types.js";
import { JobNotFoundError } from "../../../src/errors/index.js";
import { buildJob } from "../../factories/job.factory.js";
import { createMockJobsRepository } from "../../helpers/mockJobs.js";

const admin = {
  userId: "admin-1",
  email: "admin@example.com",
  role: UserRole.ADMIN,
} as const;

const recruiter = {
  userId: "r1",
  email: "rec@example.com",
  role: UserRole.RECRUITER,
  companyId: "00000000-0000-4000-8000-000000000010",
} as const;

describe("JobsService", () => {
  it("getJob throws JobNotFoundError when missing", async () => {
    const repo = createMockJobsRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new JobsService(repo);
    await expect(service.getJob(buildJob().id, admin)).rejects.toBeInstanceOf(JobNotFoundError);
  });

  it("transitionStatus emits job.status.transition.denied when FSM rejects", async () => {
    const emitSpy = vi.spyOn(securityEvents, "emit");
    const job = buildJob({ status: JobStatus.DRAFT });
    const repo = createMockJobsRepository({
      findById: vi.fn().mockResolvedValue(job),
    });
    const service = new JobsService(repo);
    await expect(service.transitionStatus(job.id, JobStatus.COMPLETED, admin, 1)).rejects.toThrow(
      InvalidStatusTransitionError,
    );
    expect(emitSpy).toHaveBeenCalledWith(
      "job.status.transition.denied",
      expect.objectContaining({
        jobId: job.id,
        from: JobStatus.DRAFT,
        to: JobStatus.COMPLETED,
        userId: admin.userId,
      }),
    );
    emitSpy.mockRestore();
  });

  it("createJob forbids recruiter from creating for another company", async () => {
    const repo = createMockJobsRepository();
    const service = new JobsService(repo);
    await expect(
      service.createJob(
        {
          companyId: "00000000-0000-4000-8000-000000009999",
          title: "Some role",
          startAt: "2026-04-01T09:00:00.000Z",
          endAt: "2026-04-30T17:00:00.000Z",
          salary: 100,
          currency: "GBP",
        },
        recruiter,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
