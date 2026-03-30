import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Ensures workers have env before any module import (runs when Vitest loads this config). */
function applyVitestEnvDefaults(): void {
  const defaults: Record<string, string> = {
    PORT: "3001",
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "x".repeat(32),
    IDENTITY_INTERNAL_URL: "http://identity:4001",
    INTERNAL_SECRET: "y".repeat(32),
    CORS_ORIGINS: "http://localhost:3000",
    RATE_LIMIT_WINDOW_MS: "60000",
    RATE_LIMIT_MAX_READ: "100",
    RATE_LIMIT_MAX_WRITE: "10000",
    RATE_LIMIT_MAX_ADMIN: "10",
    RATE_LIMIT_MAX_AUTH_BURST: "10000",
    TRUST_PROXY_HOPS: "0",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

applyVitestEnvDefaults();

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/types/**"],
    },
  },
  resolve: {
    alias: {
      "@infra/shared-auth": path.resolve(__dirname, "../../packages/shared-auth/dist/index.js"),
      "@infra/shared-errors": path.resolve(__dirname, "../../packages/shared-errors/dist/index.js"),
      "@infra/shared-db": path.resolve(__dirname, "../../packages/shared-db/dist/index.js"),
      "@infra/shared-observability": path.resolve(__dirname, "../../packages/shared-observability/dist/index.js"),
      "@infra/shared-permissions": path.resolve(__dirname, "../../packages/shared-permissions/dist/index.js"),
      "@infra/shared-validation": path.resolve(__dirname, "../../packages/shared-validation/dist/index.js"),
    },
  },
});
