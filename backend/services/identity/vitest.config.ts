import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
    // Inject fake Supabase credentials so env.ts validation passes at import time.
    // These are NOT real credentials — tests mock the Supabase client.
    env: {
      NODE_ENV: "test",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key-for-vitest-only",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-for-vitest-only",
      ALLOWED_ORIGINS: "http://localhost:3000",
    },
  },
});

