import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceUnavailableError } from "@infra/shared-errors";
import { randomUUID } from "node:crypto";
import { getRequestId } from "@infra/shared-observability";
import type { UserRole } from "@infra/shared-permissions";
import { logger } from "../../../observability/logger.js";

const SYSTEM_ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function toAuditUserId(actorId: string): string | null {
  return actorId === SYSTEM_ZERO_UUID ? null : actorId;
}

export type AuditLogWrite = {
  eventName: string;
  actorId: string;
  role: UserRole;
  metadata: Record<string, unknown>;
};

export type OutboxRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "delivered" | "failed" | "dead_letter";
  retry_count: number;
  next_attempt_at: string;
};

export interface AdminRepository {
  writeAuditLog(entry: AuditLogWrite): Promise<void>;
  listDueOutbox(limit: number): Promise<OutboxRow[]>;
  markOutboxDelivered(id: string): Promise<void>;
  markOutboxRetry(id: string, retryCount: number, nextAttemptAt: string, lastError: string): Promise<void>;
  markOutboxDeadLetter(id: string, retryCount: number, lastError: string): Promise<void>;
  cleanupExpiredIdempotency(limit: number): Promise<number>;
}

export class SupabaseAdminRepository implements AdminRepository {
  constructor(private readonly client: SupabaseClient) {}

  async writeAuditLog(entry: AuditLogWrite): Promise<void> {
    const { error } = await this.client.from("audit_logs").insert({
      id: randomUUID(),
      event_id: randomUUID(),
      request_id: getRequestId() ?? "unknown",
      event_name: entry.eventName,
      user_id: toAuditUserId(entry.actorId),
      role: entry.role,
      occurred_at: new Date().toISOString(),
      metadata: entry.metadata,
    });

    if (error) {
      // In some local/dev datasets, auth users are not mirrored into public.users,
      // which can trigger FK violations on audit_logs.user_id.
      // Keep core operations available by degrading audit insert to a warning.
      if (error.code === "23503") {
        logger.warn({
          requestId: getRequestId(),
          actorId: entry.actorId,
          eventName: entry.eventName,
          errorCode: error.code,
          message: error.message,
        }, "audit_log_fk_violation_skipped");
        return;
      }
      throw new ServiceUnavailableError("Failed to write audit log.", error);
    }
  }

  async listDueOutbox(limit: number): Promise<OutboxRow[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("outbox")
      .select("id, event_type, payload, status, retry_count, next_attempt_at")
      .eq("status", "pending")
      .lte("next_attempt_at", now)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new ServiceUnavailableError("Failed to load pending outbox events.", error);
    }

    return (data ?? []) as OutboxRow[];
  }

  async markOutboxDelivered(id: string): Promise<void> {
    const { error } = await this.client
      .from("outbox")
      .update({
        status: "delivered",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", id);

    if (error) {
      throw new ServiceUnavailableError("Failed to mark outbox event delivered.", error);
    }
  }

  async markOutboxRetry(id: string, retryCount: number, nextAttemptAt: string, lastError: string): Promise<void> {
    const { error } = await this.client
      .from("outbox")
      .update({
        status: "pending",
        retry_count: retryCount,
        next_attempt_at: nextAttemptAt,
        last_error: lastError,
      })
      .eq("id", id);

    if (error) {
      throw new ServiceUnavailableError("Failed to schedule outbox retry.", error);
    }
  }

  async markOutboxDeadLetter(id: string, retryCount: number, lastError: string): Promise<void> {
    const { error } = await this.client
      .from("outbox")
      .update({
        status: "dead_letter",
        retry_count: retryCount,
        last_error: lastError,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new ServiceUnavailableError("Failed to dead-letter outbox event.", error);
    }
  }

  async cleanupExpiredIdempotency(limit: number): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("idempotency_keys")
      .select("idempotency_key, canonical_route, actor_id, method")
      .lt("expires_at", now)
      .order("expires_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new ServiceUnavailableError("Failed to load expired idempotency records.", error);
    }

    const rows = (data ?? []) as Array<{
      idempotency_key: string;
      canonical_route: string;
      actor_id: string;
      method: string;
    }>;

    let deleted = 0;
    for (const row of rows) {
      const result = await this.client
        .from("idempotency_keys")
        .delete()
        .eq("idempotency_key", row.idempotency_key)
        .eq("canonical_route", row.canonical_route)
        .eq("actor_id", row.actor_id)
        .eq("method", row.method);

      if (result.error) {
        throw new ServiceUnavailableError("Failed to delete expired idempotency record.", result.error);
      }
      deleted += 1;
    }

    return deleted;
  }
}
