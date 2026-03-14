// Barrel for Supabase client factories.
//
// Always import clients from here — not from the individual files — so the
// choice of client (anon, server-scoped, service-role) is explicit at every
// call site.
//
// Note: getBrowserClient was removed from this service. It belongs in the
// Next.js app at lib/supabase/client.browser.ts.

export { createAnonClient, createServerClient, createServiceRoleClient } from "./client.server.js";
