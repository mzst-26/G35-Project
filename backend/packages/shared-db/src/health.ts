import { createServiceRoleClient } from "./client.js";

export interface DbHealthResult {
  ok: boolean;
  latencyMs: number;
}

// Performs a lightweight read probe to verify database connectivity.
// Returns { ok: true } on success, { ok: false } on any error.
// PGRST116 (no rows found) and 42P01 (probe table missing) are treated as healthy.
export async function checkDbHealth(): Promise<DbHealthResult> {
  const start = Date.now();
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("users").select("id").limit(1).maybeSingle();
    const latencyMs = Date.now() - start;
    // 42P01 can happen when a specific probe table does not exist in a service schema.
    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      return { ok: false, latencyMs };
    }
    return { ok: true, latencyMs };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
