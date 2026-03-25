import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { startIdempotencyCleanupWorker } from "../../src/workers/idempotency.cleanup.worker.js";

describe("idempotency cleanup worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cleans up expired idempotency keys at configured interval", async () => {
    const cleanupMock = vi.fn().mockResolvedValue({ deleted: 150 });
    const adminServiceMock = { cleanupExpiredIdempotency: cleanupMock } as any;

    const stop = startIdempotencyCleanupWorker(adminServiceMock, 3600000);

    expect(cleanupMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3600000);
    await vi.runAllTimersAsync();

    expect(cleanupMock).toHaveBeenCalledOnce();
    expect(cleanupMock).toHaveBeenCalledWith(10_000, expect.objectContaining({
      userId: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    }));

    vi.advanceTimersByTime(3600000);
    await vi.runAllTimersAsync();

    expect(cleanupMock).toHaveBeenCalledTimes(2);

    stop();
  });

  it("uses 6 hour default interval", async () => {
    const cleanupMock = vi.fn().mockResolvedValue({ deleted: 100 });
    const adminServiceMock = { cleanupExpiredIdempotency: cleanupMock } as any;

    const stop = startIdempotencyCleanupWorker(adminServiceMock);

    const sixHoursInMs = 6 * 60 * 60 * 1000;
    vi.advanceTimersByTime(sixHoursInMs);
    await vi.runAllTimersAsync();

    expect(cleanupMock).toHaveBeenCalled();

    stop();
  });

  it("handles cleanup errors gracefully", async () => {
    const error = new Error("cleanup failed");
    const cleanupMock = vi.fn().mockRejectedValue(error);
    const adminServiceMock = { cleanupExpiredIdempotency: cleanupMock } as any;

    const stop = startIdempotencyCleanupWorker(adminServiceMock, 1000);

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(cleanupMock).toHaveBeenCalled();

    stop();
  });
});
