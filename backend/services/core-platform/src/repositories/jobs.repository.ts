import type { SupabaseClient } from "@supabase/supabase-js";
import { InvalidStatusTransitionError, ServiceUnavailableError } from "@infra/shared-errors";
import { JobStatus, type CreateJobData, type Job, type JobFilters, type JobStatusHistoryEntry, type UpdateJobData } from "../domain/jobs/jobs.types.js";
import { JobNotFoundError, JobVersionConflictError } from "../errors/index.js";
import { mapHistoryRow, mapJob, type JobRow, type JobStatusHistoryRow } from "./job.mapper.js";

export interface JobsRepository {
  findById(id: string): Promise<Job | null>;
  findMany(filters: JobFilters): Promise<{ data: Job[]; total: number }>;
  create(data: CreateJobData): Promise<Job>;
  update(id: string, data: UpdateJobData, currentVersion: number): Promise<Job>;
  transitionStatus(
    id: string,
    to: JobStatus,
    actorId: string,
    currentVersion: number,
    reason?: string,
  ): Promise<Job>;
  findStatusHistory(jobId: string): Promise<JobStatusHistoryEntry[]>;
}

type RpcTransitionPayload = {
  ok: boolean;
  error?: string;
  job?: JobRow;
};

export class SupabaseJobsRepository implements JobsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Job | null> {
    const { data, error } = await this.client.from("jobs").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new ServiceUnavailableError("Jobs storage is unavailable.", error);
    }
    if (!data) {
      return null;
    }
    return mapJob(data as JobRow);
  }

  async findMany(filters: JobFilters): Promise<{ data: Job[]; total: number }> {
    let q = this.client.from("jobs").select("*", { count: "exact" });

    if (filters.companyId) {
      q = q.eq("company_id", filters.companyId);
    }
    if (filters.status) {
      q = q.eq("status", filters.status);
    }
    if (filters.assignedWorkerId) {
      q = q.eq("assigned_worker_id", filters.assignedWorkerId);
    }

    const from = filters.offset;
    const to = filters.offset + filters.limit - 1;
    const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
    if (error) {
      throw new ServiceUnavailableError("Jobs storage is unavailable.", error);
    }
    const rows = (data ?? []) as JobRow[];
    return {
      data: rows.map(mapJob),
      total: count ?? rows.length,
    };
  }

  async create(data: CreateJobData): Promise<Job> {
    const insert = {
      company_id: data.companyId,
      title: data.title,
      description: data.description ?? null,
      start_at: data.startAt,
      end_at: data.endAt,
      salary: data.salary,
      currency: data.currency,
      status: JobStatus.DRAFT,
    };
    const { data: row, error } = await this.client.from("jobs").insert(insert).select("*").single();
    if (error) {
      throw new ServiceUnavailableError("Failed to create job.", error);
    }
    return mapJob(row as JobRow);
  }

  async update(id: string, data: UpdateJobData, currentVersion: number): Promise<Job> {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.startAt !== undefined) patch.start_at = data.startAt;
    if (data.endAt !== undefined) patch.end_at = data.endAt;
    if (data.salary !== undefined) patch.salary = data.salary;
    if (data.currency !== undefined) patch.currency = data.currency;
    patch.version = currentVersion + 1;
    patch.updated_at = new Date().toISOString();

    const { data: row, error } = await this.client
      .from("jobs")
      .update(patch)
      .eq("id", id)
      .eq("version", currentVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Failed to update job.", error);
    }
    if (!row) {
      const exists = await this.findById(id);
      if (!exists) {
        throw new JobNotFoundError(id);
      }
      throw new JobVersionConflictError();
    }
    return mapJob(row as JobRow);
  }

  async transitionStatus(
    id: string,
    to: JobStatus,
    actorId: string,
    currentVersion: number,
    reason?: string,
  ): Promise<Job> {
    const { data, error } = await this.client.rpc("transition_job_status", {
      p_job_id: id,
      p_to_status: to,
      p_expected_version: currentVersion,
      p_actor_id: actorId,
      p_reason: reason ?? "",
    });

    if (error) {
      throw new ServiceUnavailableError("Failed to transition job status.", error);
    }

    const payload = data as RpcTransitionPayload;
    if (!payload.ok) {
      if (payload.error === "not_found") {
        throw new JobNotFoundError(id);
      }
      if (payload.error === "version_conflict") {
        throw new JobVersionConflictError();
      }
      if (payload.error === "invalid_transition") {
        throw new InvalidStatusTransitionError("unknown", to);
      }
      throw new ServiceUnavailableError(
        `Job transition failed: ${payload.error ?? "unknown"}.`,
      );
    }
    if (!payload.job) {
      throw new ServiceUnavailableError("Job transition returned an invalid payload.");
    }
    return mapJob(payload.job);
  }

  async findStatusHistory(jobId: string): Promise<JobStatusHistoryEntry[]> {
    const { data, error } = await this.client
      .from("job_status_history")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ServiceUnavailableError("Jobs status history storage is unavailable.", error);
    }
    const rows = (data ?? []) as JobStatusHistoryRow[];
    return rows.map(mapHistoryRow);
  }
}
