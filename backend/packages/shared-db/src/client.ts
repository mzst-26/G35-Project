// Supabase client factories with correct role separation.
//
// Three clients, two trust levels:
//   createAnonClient()          — public anon key, respects RLS
//   createServiceRoleClient()   — service-role key, bypasses RLS ⚠️
//
// Rules:
//   - Never expose service_role key outside this module.
//   - Always create a new instance per request for service-role (no shared state).
//   - Read env at call time, not at module load, so tests can override env vars.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ServiceUnavailableError } from "@infra/shared-errors";

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ServiceUnavailableError(`Environment variable ${name} is required but not set.`);
  }
  return value;
}

// Creates a client with the public anon key.
// Respects Row Level Security — use for user-context operations.
export function createAnonClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: SERVER_AUTH_OPTIONS,
  });
}

// Creates a client with the service-role key.
//
// ⚠️  Bypasses ALL Row Level Security.
// Permitted use cases: admin writes, migration helpers, background jobs.
// Do NOT use on public-facing request handlers unless you have validated scope.
export function createServiceRoleClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: SERVER_AUTH_OPTIONS,
  });
}
