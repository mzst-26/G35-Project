import { JobStatus, type Job } from "../../src/domain/jobs/jobs.types.js";

export function buildJob(overrides: Partial<Job> = {}): Job {
  const base: Job = {
    id: "00000000-0000-4000-8000-000000000001",
    companyId: "00000000-0000-4000-8000-000000000010",
    title: "Test electrician role",
    description: "Desc",
    startAt: "2026-04-01T09:00:00.000Z",
    endAt: "2026-04-30T17:00:00.000Z",
    salary: 350,
    currency: "GBP",
    status: JobStatus.DRAFT,
    assignedWorkerId: null,
    version: 1,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
  };
  return { ...base, ...overrides };
}
