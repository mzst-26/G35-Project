import type { Job } from "../domain/types.js";

export function jobToJson(job: Job) {
  return {
    id: job.id,
    companyId: job.companyId,
    title: job.title,
    description: job.description,
    startAt: job.startAt,
    endAt: job.endAt,
    salary: job.salary,
    currency: job.currency,
    status: job.status,
    assignedWorkerId: job.assignedWorkerId,
    version: job.version,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
