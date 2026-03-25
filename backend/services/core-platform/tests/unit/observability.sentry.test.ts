import { afterEach, describe, expect, it, vi } from "vitest";

describe("initialiseSentry", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("sets env wiring and delegates to shared bootstrap", async () => {
    const bootstrapSpy = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@infra/shared-observability", () => ({
      initialiseSentry: bootstrapSpy,
    }));

    vi.doMock("../../src/config/env.js", () => ({
      env: {
        NODE_ENV: "production",
        GIT_SHA: "abc123",
      },
    }));

    const mod = await import("../../src/observability/sentry.js");
    await mod.initialiseSentry();

    expect(process.env.SENTRY_ENVIRONMENT).toBe("production");
    expect(process.env.GIT_SHA).toBe("abc123");
    expect(bootstrapSpy).toHaveBeenCalledWith("core-platform");
  });
});
