// Supabase browser client factory for the Next.js app.
//
// Uses @supabase/ssr createBrowserClient so GoTrue stores tokens in cookies
// rather than localStorage — compatible with httpOnly SSR cookie patterns
// and Next.js server components.
//
// Rules:
//   Only import NEXT_PUBLIC_* vars here — the only values safe for browser bundles.
//   Never import this file in Node.js server code or the identity microservice.

import { createBrowserClient as ssrCreateBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof ssrCreateBrowserClient>;

let _browserClient: BrowserClient | null = null;

// Returns the singleton browser Supabase client.
// Safe to call multiple times — same instance is returned after the first call.
export function getBrowserClient(): BrowserClient {
  if (_browserClient) return _browserClient;

  _browserClient = ssrCreateBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );

  return _browserClient;
}

// Resets the singleton — for test isolation ONLY, never call in production.
export function _resetBrowserClientForTests(): void {
  _browserClient = null;
}
