import { z } from "zod";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const defaultRuntimeEnv = process.env.NODE_ENV === "production" ? "production" : "development";
const runtimeEnv = process.env.CORE_PLATFORM_ENV ?? defaultRuntimeEnv;
const envFilesByPriority = [
  `.env.${runtimeEnv}.local`,
  `.env.${runtimeEnv}`,
  ".env.local",
  ".env",
];

if (process.env.NODE_ENV !== "test") {
  for (const relativePath of envFilesByPriority) {
    const absolutePath = resolve(process.cwd(), relativePath);
    if (!existsSync(absolutePath)) continue;
    loadDotenv({ path: absolutePath });
  }
}

const envSchema = z.object({
  CORE_PLATFORM_ENV: z.enum(["local", "development", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).optional(),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL."),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY must be at least 20 chars."),
  IDENTITY_INTERNAL_URL: z.string().url("IDENTITY_INTERNAL_URL must be a valid URL."),
  INTERNAL_SECRET: z.string().min(32, "INTERNAL_SECRET must be at least 32 chars."),
  CORS_ORIGINS: z.string().min(1, "CORS_ORIGINS is required."),
  SENTRY_DSN: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_READ: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_MAX_WRITE: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_MAX_ADMIN: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_MAX_AUTH_BURST: z.coerce.number().int().positive().default(50),
  CHANGE_FEE_WINDOW_HOURS: z.coerce.number().int().positive().default(48),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(32).default(0),
  SKIP_BACKGROUND_WORKERS: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  GIT_SHA: z.string().optional(),
});

export type Env = z.infer<typeof envSchema> & {
  CORS_ORIGINS: string[];
};

function parseEnv(): Env {
  if (!process.env.CORE_PLATFORM_ENV) {
    process.env.CORE_PLATFORM_ENV = runtimeEnv;
  }

  // Backward-compatible alias for shared-auth package, which reads IDENTITY_SERVICE_URL.
  if (!process.env.IDENTITY_SERVICE_URL && process.env.IDENTITY_INTERNAL_URL) {
    process.env.IDENTITY_SERVICE_URL = process.env.IDENTITY_INTERNAL_URL;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    process.stderr.write(`Invalid environment configuration: ${parsed.error.message}\n`);
    process.exit(1);
  }

  const origins = parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0) {
    process.stderr.write("Invalid environment configuration: CORS_ORIGINS must include at least one origin.\n");
    process.exit(1);
  }

  if (parsed.data.NODE_ENV === "production" && !parsed.data.SENTRY_DSN) {
    process.stderr.write("Warning: SENTRY_DSN is missing in production.\n");
  }

  return Object.freeze({
    ...parsed.data,
    CORS_ORIGINS: origins,
  }) as Env;
}

export const env: Env = parseEnv();

/** Backwards-compatible getter for existing imports. */
export function getEnv(): Env {
  return env;
}
