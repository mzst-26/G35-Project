import { createServiceRoleClient } from "./client.js";

export interface DbHealthResult {
  ok: boolean;
  latencyMs: number;
}

// Performs a lightweight read probe to verify database connectivity.
// Returns { ok: true } on success, { ok: false } on any error.
// PGRST116 (no rows found) is treated as healthy — the connection is live.
export async function checkDbHealth(): Promise<DbHealthResult> {
  const start = Date.now();
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("users").select("id").limit(1).maybeSingle();
    const latencyMs = Date.now() - start;
    // PGRST116: no rows — still a live, healthy connection
    if (error && error.code !== "PGRST116") {
      return { ok: false, latencyMs };
    }
    return { ok: true, latencyMs };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
