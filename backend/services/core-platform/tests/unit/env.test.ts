import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

function setValidEnv(): void {
  process.env = {
    ...ORIGINAL_ENV,
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
    RATE_LIMIT_MAX_WRITE: "20",
    RATE_LIMIT_MAX_ADMIN: "10",
  };
}

describe("env config", () => {
  beforeEach(() => {
    vi.resetModules();
    setValidEnv();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("parses valid environment and freezes env object", async () => {
    const mod = await import("../../src/config/env.js");
    expect(mod.env.PORT).toBe(3001);
    expect(Object.isFrozen(mod.env)).toBe(true);
  });

  it("exits explicitly when required vars are missing", async () => {
    delete process.env.SUPABASE_URL;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`EXIT_${code}`);
    }) as never);

    await expect(import("../../src/config/env.js")).rejects.toThrow("EXIT_1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
