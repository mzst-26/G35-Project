// Environment variable schema and validation for the identity service.
//
// Rules:
//  - All required variables must be present at startup (Zod will throw if not).
//  - Secret variables (SUPABASE_SERVICE_ROLE_KEY, COOKIE_SECRET) must NEVER be logged.
//  - COOKIE_SECRET and SENTRY_DSN are required when NODE_ENV=production.
//  - REDIS_URL is optional in dev/test; required before multi-replica deployment.

import { z } from "zod";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envFilesByPriority = [
  `.env.${nodeEnv}.local`,
  `.env.${nodeEnv}`,
  ".env.local",
  ".env",
];

for (const relativePath of envFilesByPriority) {
  const absolutePath = resolve(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) continue;
  loadDotenv({ path: absolutePath });
}

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  // ── Service ──────────────────────────────────────────────────────────────
  PORT: z.string().optional().default("4001"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional().default("info"),

  // ── Supabase — server credentials (NEVER expose to browser) ──────────────
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL."),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY must not be empty."),
  /** ⚠️  Service role key — bypasses RLS. Restrict to admin operations only. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty."),

  // Sentry — required in production, optional in dev/test.
  SENTRY_DSN: isProduction
    ? z.string().url("SENTRY_DSN must be a valid URL in production.")
    : z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional().default("0.1"),
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: z.string().optional().default("0"),
  SENTRY_SEND_DEFAULT_PII: z.enum(["true", "false"]).optional().default("false"),

  // ── CORS — comma-separated list of trusted front-end origins ────────────
  // Example: "http://localhost:3000,https://app.example.com"
  // If omitted, the service rejects all cross-origin requests in production.
  ALLOWED_ORIGINS: z.string().optional(),

  // Required in production for HMAC-signed CSRF tokens.
  COOKIE_SECRET: isProduction
    ? z.string().min(32, "COOKIE_SECRET must be at least 32 chars in production.")
    : z.string().optional(),

  // When set, the rate limiter switches to Redis for multi-replica safety.
  REDIS_URL: z.string().url().optional(),

  // Shared secret used by other microservices to authenticate internal calls.
  // Set to a long random string (openssl rand -hex 32).
  INTERNAL_SECRET: z.string().min(32).optional(),

  // Optional log file path for persistent log storage.
  LOG_FILE: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
