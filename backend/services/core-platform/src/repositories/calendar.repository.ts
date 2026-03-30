import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceUnavailableError } from "@infra/shared-errors";
import { randomUUID } from "node:crypto";
import { JobStatus } from "../domain/jobs/jobs.types.js";
import { logger } from "../observability/logger.js";
import {
  type AuditEntry,
  type CreateAvailabilityInput,
  type DateRange,
  type DateRangeFilter,
  type OverlappingJob,
  type UpdateAvailabilityInput,
  type WorkerAvailability,
} from "../domain/calendar/calendar.types.js";
import { AvailabilityNotFoundError, AvailabilityVersionConflictError } from "../errors/index.js";

type WorkerAvailabilityRow = {
  id: string;
  worker_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  recurring: boolean | null;
  available: boolean | null;
  locked: boolean | null;
  original_availability: boolean | null;
  version: number;
  created_at: string;
  updated_at: string;
};

type JobOverlapRow = {
  id: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type CreateAvailabilityData = {
  workerId: string;
} & CreateAvailabilityInput;

export type UpdateAvailabilityData = Omit<UpdateAvailabilityInput, "version">;

export interface CalendarRepository {
  findAvailabilityById(id: string): Promise<WorkerAvailability | null>;
  findAvailabilityForWorker(workerId: string, filters: DateRangeFilter): Promise<WorkerAvailability[]>;
  createAvailability(data: CreateAvailabilityData): Promise<WorkerAvailability>;
  updateAvailability(id: string, data: UpdateAvailabilityData, currentVersion: number): Promise<WorkerAvailability>;
  deleteAvailability(id: string, currentVersion: number): Promise<void>;
  findOverlappingJobs(workerId: string, dateRange: DateRange): Promise<OverlappingJob[]>;
  writeAuditEntry(entry: AuditEntry): Promise<void>;
}

function toDateOnly(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString().slice(0, 10);
}

function startOfDayUtc(date: Date): Date {
  return new Date(`${toDateOnly(date)}T00:00:00.000Z`);
}

function endOfDayUtc(date: Date): Date {
  return new Date(`${toDateOnly(date)}T23:59:59.999Z`);
}

function parseUtcDateOrTimestamp(raw: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
}

function mapAvailability(row: WorkerAvailabilityRow): WorkerAvailability {
  return {
    id: row.id,
    workerId: row.worker_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    recurring: row.recurring ?? false,
    available: row.available ?? true,
    locked: row.locked ?? false,
    originalAvailability: row.original_availability,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOverlapJob(row: JobOverlapRow): OverlappingJob | null {
  const startRaw = row.start_at ?? row.start_date;
  if (!startRaw) {
    return null;
  }

  return {
    id: row.id,
    status: row.status as JobStatus,
    startAt: parseUtcDateOrTimestamp(startRaw),
  };
}

function overlapsRange(row: JobOverlapRow, range: DateRange): boolean {
  const startRaw = row.start_at ?? row.start_date;
  const endRaw = row.end_at ?? row.end_date ?? startRaw;
  if (!startRaw || !endRaw) {
    return false;
  }

  const jobStart = parseUtcDateOrTimestamp(startRaw);
  const jobEnd = parseUtcDateOrTimestamp(endRaw);
  return jobStart <= range.end && jobEnd >= range.start;
}

type SupabaseErrorLike = { code?: string; message?: string };

const SYSTEM_ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function toAuditUserId(actorId: string): string | null {
  return actorId === SYSTEM_ZERO_UUID ? null : actorId;
}

function isMissingAuditLogTable(error: SupabaseErrorLike | null | undefined): boolean {
  return (
    error?.code === "42P01" ||
    (error?.message?.includes('relation "audit_log"') ?? false)
  );
}

export class SupabaseCalendarRepository implements CalendarRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAvailabilityById(id: string): Promise<WorkerAvailability | null> {
    const { data, error } = await this.client
      .from("worker_availability")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Calendar storage is unavailable.", error);
    }

    return data ? mapAvailability(data as WorkerAvailabilityRow) : null;
  }

  async findAvailabilityForWorker(workerId: string, filters: DateRangeFilter): Promise<WorkerAvailability[]> {
    let query = this.client
      .from("worker_availability")
      .select("*")
      .eq("worker_id", workerId)
      .order("date", { ascending: true });

    if (filters.from) {
      query = query.gte("date", toDateOnly(filters.from));
    }
    if (filters.to) {
      query = query.lte("date", toDateOnly(filters.to));
    }

    const { data, error } = await query;
    if (error) {
      throw new ServiceUnavailableError("Calendar storage is unavailable.", error);
    }

    return ((data ?? []) as WorkerAvailabilityRow[]).map(mapAvailability);
  }

  async createAvailability(data: CreateAvailabilityData): Promise<WorkerAvailability> {
    const { data: row, error } = await this.client
      .from("worker_availability")
      .insert({
        worker_id: data.workerId,
        date: toDateOnly(data.date),
        start_time: data.startTime,
        end_time: data.endTime,
        recurring: data.recurring,
        available: true,
        version: 1,
      })
      .select("*")
      .single();

    if (error) {
      throw new ServiceUnavailableError("Failed to create availability.", error);
    }

    return mapAvailability(row as WorkerAvailabilityRow);
  }

  async updateAvailability(id: string, data: UpdateAvailabilityData, currentVersion: number): Promise<WorkerAvailability> {
    const patch: Record<string, unknown> = {
      version: currentVersion + 1,
      updated_at: new Date().toISOString(),
    };

    if (data.date !== undefined) patch.date = toDateOnly(data.date);
    if (data.startTime !== undefined) patch.start_time = data.startTime;
    if (data.endTime !== undefined) patch.end_time = data.endTime;
    if (data.recurring !== undefined) patch.recurring = data.recurring;
    if (data.available !== undefined) patch.available = data.available;

    const { data: row, error } = await this.client
      .from("worker_availability")
      .update(patch)
      .eq("id", id)
      .eq("version", currentVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Failed to update availability.", error);
    }

    if (!row) {
      const exists = await this.findAvailabilityById(id);
      if (!exists) {
        throw new AvailabilityNotFoundError(id);
      }
      throw new AvailabilityVersionConflictError();
    }

    return mapAvailability(row as WorkerAvailabilityRow);
  }

  async deleteAvailability(id: string, currentVersion: number): Promise<void> {
    const { data, error } = await this.client
      .from("worker_availability")
      .delete()
      .eq("id", id)
      .eq("version", currentVersion)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Failed to delete availability.", error);
    }

    if (!data) {
      const exists = await this.findAvailabilityById(id);
      if (!exists) {
        throw new AvailabilityNotFoundError(id);
      }
      throw new AvailabilityVersionConflictError();
    }
  }

  async findOverlappingJobs(workerId: string, dateRange: DateRange): Promise<OverlappingJob[]> {
    const { data, error } = await this.client
      .from("jobs")
      .select("id,status,start_at,end_at,start_date,end_date")
      .eq("assigned_worker_id", workerId)
      .in("status", [JobStatus.FILLED, JobStatus.IN_PROGRESS, JobStatus.OPEN]);

    if (error) {
      throw new ServiceUnavailableError("Failed to load overlapping jobs.", error);
    }

    const range = {
      start: startOfDayUtc(dateRange.start),
      end: endOfDayUtc(dateRange.end),
    };

    return ((data ?? []) as JobOverlapRow[])
      .filter((row) => overlapsRange(row, range))
      .map(mapOverlapJob)
      .filter((row): row is OverlappingJob => row !== null);
  }

  async writeAuditEntry(entry: AuditEntry): Promise<void> {
    const primaryInsert = {
      action: entry.action,
      actor_id: entry.actorId,
      worker_id: entry.workerId,
      availability_id: entry.availabilityId,
      request_id: entry.requestId ?? null,
      payload: entry.payload,
      created_at: entry.timestamp.toISOString(),
    };

    const { error } = await this.client.from("audit_log").insert(primaryInsert);
    if (!error) {
      return;
    }

    if (!isMissingAuditLogTable(error as SupabaseErrorLike)) {
      throw new ServiceUnavailableError("Failed to write calendar audit entry.", error);
    }

    const fallback = await this.client.from("audit_logs").insert({
      id: randomUUID(),
      event_id: randomUUID(),
      request_id: entry.requestId ?? randomUUID(),
      event_name: `calendar.availability.${entry.action}`,
      user_id: toAuditUserId(entry.actorId),
      role: null,
      ip_subnet: null,
      occurred_at: entry.timestamp.toISOString(),
      metadata: {
        workerId: entry.workerId,
        availabilityId: entry.availabilityId,
        payload: entry.payload,
      },
    });

    if (fallback.error) {
      const fallbackError = fallback.error as SupabaseErrorLike;
      if (fallbackError.code === "23503") {
        logger.warn(
          {
            actorId: entry.actorId,
            workerId: entry.workerId,
            action: entry.action,
            errorCode: fallbackError.code,
            message: fallbackError.message,
          },
          "calendar_audit_log_fk_violation_skipped",
        );
        return;
      }
      throw new ServiceUnavailableError("Failed to write calendar audit entry.", fallback.error);
    }
  }
}
