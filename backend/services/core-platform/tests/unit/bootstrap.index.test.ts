import { afterEach, describe, expect, it, vi } from "vitest";

describe("bootstrap index", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("initialises sentry and starts HTTP listener", async () => {
    const listenSpy = vi.fn((_: number, cb: () => void) => {
      cb();
      return { close: vi.fn() };
    });

    const appMock = { listen: listenSpy };

    vi.doMock("../../src/config/env.js", () => ({
      getEnv: () => ({ PORT: 3001, SKIP_BACKGROUND_WORKERS: true }),
    }));
    vi.doMock("../../src/observability/sentry.js", () => ({
      initialiseSentry: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/observability/logger.js", () => ({
      logger: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("../../src/app.js", () => ({
      createApp: vi.fn().mockResolvedValue({ app: appMock }),
    }));

    const onceSpy = vi.spyOn(process, "once").mockImplementation(() => process);

    await import("../../src/index.js");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listenSpy).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });
});
