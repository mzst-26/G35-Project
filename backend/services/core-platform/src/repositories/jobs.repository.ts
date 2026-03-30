import type { SupabaseClient } from "@supabase/supabase-js";
import { BadRequestError, InvalidStatusTransitionError, ServiceUnavailableError } from "@infra/shared-errors";
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

function isMissingJobsTitleColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return message.includes("could not find the 'title' column of 'jobs'");
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

function normalizeTradeHint(value: string): string {
  return value.trim().toLowerCase();
}

function inferTradeHintFromTitle(title: string): string {
  return normalizeTradeHint(title.split("-")[0] ?? title);
}

export class SupabaseJobsRepository implements JobsRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async resolveTradeId(data: CreateJobData): Promise<string> {
    const preferredHint = data.tradeType ? normalizeTradeHint(data.tradeType) : "";
    const fallbackHint = inferTradeHintFromTitle(data.title);
    const hint = preferredHint || fallbackHint;

    const findBy = async (pattern: string) => {
      const { data: row, error } = await this.client
        .from("trades")
        .select("id")
        .ilike("display_name", pattern)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new ServiceUnavailableError("Failed to resolve trade for job creation.", error);
      }

      return row?.id ?? null;
    };

    const exactId = await findBy(hint);
    if (exactId) {
      return exactId;
    }

    const escapedHint = hint.replace(/[%_]/g, "");
    const fuzzyId = await findBy(`%${escapedHint}%`);
    if (fuzzyId) {
      return fuzzyId;
    }

    throw new BadRequestError(
      `Unknown trade type '${data.tradeType ?? hint}'. Please provide a valid trade type.`,
    );
  }

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
    const tradeId = await this.resolveTradeId(data);
    const insertWithTitle = {
      company_id: data.companyId,
      trade_id: tradeId,
      title: data.title,
      special_requirements: data.title,
      description: data.description ?? null,
      workers_needed: data.workersNeeded ?? 1,
      start_at: data.startAt,
      start_date: toIsoDate(data.startAt),
      end_at: data.endAt,
      end_date: toIsoDate(data.endAt),
      salary: data.salary,
      currency: data.currency,
      status: JobStatus.DRAFT,
    };
    const { data: primaryRow, error: primaryError } = await this.client
      .from("jobs")
      .insert(insertWithTitle)
      .select("*")
      .single();
    if (!primaryError) {
      return mapJob(primaryRow as JobRow);
    }

    if (!isMissingJobsTitleColumnError(primaryError)) {
      throw new ServiceUnavailableError("Failed to create job.", primaryError);
    }

    const { title: _ignoredTitle, ...insertFallback } = insertWithTitle;
    const { data: fallbackRow, error: fallbackError } = await this.client
      .from("jobs")
      .insert(insertFallback)
      .select("*")
      .single();
    if (fallbackError) {
      throw new ServiceUnavailableError("Failed to create job.", fallbackError);
    }
    return mapJob(fallbackRow as JobRow);
  }

  async update(id: string, data: UpdateJobData, currentVersion: number): Promise<Job> {
    const basePatch: Record<string, unknown> = {};
    if (data.title !== undefined) {
      basePatch.title = data.title;
      basePatch.special_requirements = data.title;
    }
    if (data.description !== undefined) basePatch.description = data.description;
    if (data.startAt !== undefined) {
      basePatch.start_at = data.startAt;
      basePatch.start_date = toIsoDate(data.startAt);
    }
    if (data.endAt !== undefined) {
      basePatch.end_at = data.endAt;
      basePatch.end_date = toIsoDate(data.endAt);
    }
    if (data.salary !== undefined) basePatch.salary = data.salary;
    if (data.currency !== undefined) basePatch.currency = data.currency;
    basePatch.version = currentVersion + 1;
    basePatch.updated_at = new Date().toISOString();

    const runUpdate = (patch: Record<string, unknown>) =>
      this.client
        .from("jobs")
        .update(patch)
        .eq("id", id)
        .eq("version", currentVersion)
        .select("*")
        .maybeSingle();

    let { data: row, error } = await runUpdate(basePatch);

    if (error && isMissingJobsTitleColumnError(error) && "title" in basePatch) {
      const { title: _ignoredTitle, ...fallbackPatch } = basePatch;
      ({ data: row, error } = await runUpdate(fallbackPatch));
    }

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
