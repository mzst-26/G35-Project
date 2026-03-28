import type { SupabaseClient } from "@supabase/supabase-js";
import { ConflictError, ServiceUnavailableError } from "@infra/shared-errors";

const TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyRecord = {
  statusCode: number;
  responseBody: unknown;
};

export type IdempotencyContext = {
  key: string;
  actorId: string;
  method: string;
  canonicalRoute: string;
  requestHash: string;
};

export class IdempotencyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async find(context: IdempotencyContext): Promise<IdempotencyRecord | null> {
    const { data, error } = await this.client
      .from("idempotency_keys")
      .select("status_code, response_body, request_hash")
      .eq("idempotency_key", context.key)
      .eq("canonical_route", context.canonicalRoute)
      .eq("actor_id", context.actorId)
      .eq("method", context.method)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Idempotency storage is unavailable.", error);
    }
    if (!data) {
      return null;
    }
    const storedHash = (data.request_hash as string | null | undefined) ?? null;
    if (storedHash !== null && storedHash !== context.requestHash) {
      throw new ConflictError(
        "Idempotency key has already been used with a different request payload.",
        "IDEMPOTENCY_CONFLICT",
      );
    }
    return {
      statusCode: data.status_code as number,
      responseBody: data.response_body as unknown,
    };
  }

  async save(context: IdempotencyContext, statusCode: number, responseBody: unknown): Promise<void> {
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    const { error } = await this.client.from("idempotency_keys").upsert(
      {
        idempotency_key: context.key,
        route: context.canonicalRoute,
        canonical_route: context.canonicalRoute,
        actor_id: context.actorId,
        method: context.method,
        request_hash: context.requestHash,
        status_code: statusCode,
        response_body: responseBody as object,
        expires_at: expiresAt,
      },
      { onConflict: "idempotency_key,canonical_route,actor_id,method" },
    );
    if (error) {
      throw new ServiceUnavailableError("Failed to save idempotency record.", error);
    }
  }
}
