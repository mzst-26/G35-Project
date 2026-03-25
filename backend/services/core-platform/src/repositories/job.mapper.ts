import { JobStatus, type Currency, type Job, type JobStatusHistoryEntry } from "../domain/jobs/jobs.types.js";

export interface JobRow {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  salary: string | number;
  currency: string;
  status: string;
  assigned_worker_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface JobStatusHistoryRow {
  id: string;
  job_id: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  reason: string | null;
  created_at: string;
}

export function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    salary: typeof row.salary === "string" ? Number(row.salary) : row.salary,
    currency: row.currency as Currency,
    status: row.status as JobStatus,
    assignedWorkerId: row.assigned_worker_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHistoryRow(row: JobStatusHistoryRow): JobStatusHistoryEntry {
  return {
    id: row.id,
    jobId: row.job_id,
    fromStatus: row.from_status as JobStatus,
    toStatus: row.to_status as JobStatus,
    actorId: row.actor_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}
