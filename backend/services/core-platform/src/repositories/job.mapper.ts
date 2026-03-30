import { JobStatus, type Currency, type Job, type JobStatusHistoryEntry } from "../domain/jobs/jobs.types.js";

export interface JobRow {
  id: string;
  company_id: string;
  title?: string | null;
  special_requirements?: string | null;
  description: string | null;
  start_at?: string | null;
  start_date?: string | null;
  end_at?: string | null;
  end_date?: string | null;
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
  const title = row.title ?? row.special_requirements ?? row.description ?? "Untitled job";
  const startAt = row.start_at ?? row.start_date;
  const endAt = row.end_at ?? row.end_date;

  return {
    id: row.id,
    companyId: row.company_id,
    title,
    description: row.description,
    startAt: startAt ?? "",
    endAt: endAt ?? "",
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
