// Supabase server-side client factories.
//
// Three clients, three trust levels — never mix them up:
//   createAnonClient()          - unauthenticated auth-flow operations (OTP)
//   createServerClient(token)   - user-scoped operations (validated JWT in header)
//   createServiceRoleClient()   - privileged admin operations (bypasses RLS)
//
// Rules:
//   - Never instantiate createClient() directly outside this file.
//   - Never pass the service-role client to browser code or user-facing handlers.
//   - createServerClient is stateless — create per request, discard after.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { InternalAuthError } from "../errors/index.js";

// Shared auth options for all server-side clients — no local state, no redirects.
const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
} as const;

// ---------------------------------------------------------------------------
// Anon client — used for unauthenticated auth-flow operations
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase client using the public anon key, with no user context.
 * Use for OTP dispatch and OTP verification (pre-login, no JWT available).
 *
 * This client respects RLS policies using the anon role.
 * Do NOT use it for privileged operations.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: SERVER_AUTH_OPTIONS,
  });
}

// ---------------------------------------------------------------------------
// Server client — user-scoped via JWT in Authorization header
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase client that operates within the scope of the provided
 * user access token. The token is forwarded in the Authorization header so
 * Supabase RLS evaluates all queries under the user's identity.
 *
 * @param accessToken - Verified Supabase JWT extracted from the session cookie.
 * @throws InternalAuthError if accessToken is empty (programming error).
 */
export function createServerClient(accessToken: string): SupabaseClient {
  if (!accessToken || accessToken.trim() === "") {
    throw new InternalAuthError(new Error("createServerClient requires a non-empty accessToken."));
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: SERVER_AUTH_OPTIONS,
  });
}

// ---------------------------------------------------------------------------
// Service-role client — privileged, bypasses RLS
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase client authenticated with the service-role key.
 *
 * ⚠️  Bypasses ALL Row Level Security.
 * Permitted use cases:
 *   - Forcing OTP dispatch for any email (signInWithOtp)
 *   - Admin-initiated session revocation (admin.signOut)
 *   - Validating a user JWT without needing their active session
 *   - Test seeding helpers (never in production request paths)
 *
 * Each call creates a new instance — no singleton to prevent accidental reuse
 * of a client that has accumulated user-session state mid-request.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: SERVER_AUTH_OPTIONS,
  });
}

