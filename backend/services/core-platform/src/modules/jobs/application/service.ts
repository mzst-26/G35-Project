import type { AuthenticatedUser } from "@infra/shared-auth";
import { ForbiddenError, InvalidStatusTransitionError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { getRequestId, securityEvents } from "@infra/shared-observability";
import type { UpdateJobBody } from "../contracts/validators.js";
import { logger } from "../../../observability/logger.js";
import { JobNotFoundError } from "../../../errors/index.js";
import type { JobsRepository } from "../infrastructure/repository.js";
import { assertValidTransition } from "../domain/fsm.js";
import {
  JobStatus,
  type CreateJobInput,
  type Job,
  type JobFilters,
  type PaginatedResult,
} from "../domain/types.js";

export class JobsService {
  constructor(private readonly jobs: JobsRepository) {}

  async getJob(id: string, requester: AuthenticatedUser): Promise<Job> {
    const job = await this.jobs.findById(id);
    if (!job) {
      throw new JobNotFoundError(id);
    }
    this.assertCanReadJob(job, requester);
    return job;
  }

  async listJobs(filters: JobFilters, requester: AuthenticatedUser): Promise<PaginatedResult<Job>> {
    const scoped = this.scopeListFilters(filters, requester);
    return this.jobs.findMany(scoped);
  }

  async createJob(data: CreateJobInput, requester: AuthenticatedUser): Promise<Job> {
    if (requester.role === UserRole.RECRUITER) {
      if (!requester.companyId || data.companyId !== requester.companyId) {
        throw new ForbiddenError("You may only create jobs for your own company.");
      }
    } else if (requester.role === UserRole.TRADE) {
      throw new ForbiddenError("Workers cannot create jobs.");
    } else if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Insufficient permissions to create jobs.");
    }

    return this.jobs.create(data);
  }

  async updateJob(id: string, body: UpdateJobBody, requester: AuthenticatedUser): Promise<Job> {
    const { version, ...rest } = body;
    const job = await this.jobs.findById(id);
    if (!job) {
      throw new JobNotFoundError(id);
    }
    this.assertCanWriteJob(job, requester, "update");
    return this.jobs.update(id, rest, version);
  }

  async transitionStatus(
    id: string,
    to: JobStatus,
    requester: AuthenticatedUser,
    currentVersion: number,
    reason?: string,
  ): Promise<Job> {
    const job = await this.jobs.findById(id);
    if (!job) {
      throw new JobNotFoundError(id);
    }

    try {
      assertValidTransition(job.status, to);
    } catch (err) {
      if (err instanceof InvalidStatusTransitionError) {
        securityEvents.emit("job.status.transition.denied", {
          jobId: job.id,
          from: job.status,
          to,
          userId: requester.userId,
          requestId: getRequestId(),
        });
      }
      throw err;
    }

    this.assertCanWriteJob(job, requester, "transition");

    const updated = await this.jobs.transitionStatus(id, to, requester.userId, currentVersion, reason);

    securityEvents.emit("job.status.changed", {
      jobId: updated.id,
      from: job.status,
      to,
      actorId: requester.userId,
      requestId: getRequestId(),
    });

    return updated;
  }

  private scopeListFilters(filters: JobFilters, requester: AuthenticatedUser): JobFilters {
    if (requester.role === UserRole.RECRUITER) {
      const companyId = filters.companyId ?? requester.companyId;
      if (!companyId || !requester.companyId || companyId !== requester.companyId) {
        throw new ForbiddenError("You may only list jobs for your company.");
      }
      return { ...filters, companyId };
    }
    if (requester.role === UserRole.TRADE) {
      if (!requester.workerId) {
        throw new ForbiddenError("Worker context required.");
      }
      return { ...filters, assignedWorkerId: requester.workerId };
    }
    return filters;
  }

  private assertCanReadJob(job: Job, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }
    if (requester.role === UserRole.RECRUITER) {
      if (!requester.companyId || job.companyId !== requester.companyId) {
        throw new ForbiddenError("You cannot access this job.");
      }
      return;
    }
    if (requester.role === UserRole.TRADE) {
      if (!requester.workerId || job.assignedWorkerId !== requester.workerId) {
        throw new ForbiddenError("You cannot access this job.");
      }
    }
  }

  private assertCanWriteJob(job: Job, requester: AuthenticatedUser, action: string): void {
    if (requester.role === UserRole.ADMIN) {
      if (requester.companyId && job.companyId !== requester.companyId) {
        logger.info(
          { jobId: job.id, actorId: requester.userId, action },
          "admin_job_mutation_non_company_scope",
        );
      }
      return;
    }
    if (requester.role === UserRole.RECRUITER) {
      if (!requester.companyId || job.companyId !== requester.companyId) {
        throw new ForbiddenError("You cannot modify this job.");
      }
      return;
    }
    if (requester.role === UserRole.TRADE) {
      if (!requester.workerId || job.assignedWorkerId !== requester.workerId) {
        throw new ForbiddenError("You cannot modify this job.");
      }
      return;
    }
    throw new ForbiddenError("Insufficient permissions.");
  }
}
