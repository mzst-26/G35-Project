import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { startOutboxRelayWorker } from "../../../src/workers/outbox.relay.worker.js";

describe("outbox relay worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("relays outbox entries at configured interval", async () => {
    const relayOutboxMock = vi.fn().mockResolvedValue({
      processed: 10,
      delivered: 8,
      retried: 1,
      deadLettered: 1,
    });
    const adminServiceMock = { relayOutbox: relayOutboxMock } as unknown as Parameters<
      typeof startOutboxRelayWorker
    >[0];

    const stop = startOutboxRelayWorker(adminServiceMock, 5000);

    expect(relayOutboxMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);

    expect(relayOutboxMock).toHaveBeenCalledOnce();
    expect(relayOutboxMock).toHaveBeenCalledWith(100, expect.objectContaining({
      userId: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    }));

    await vi.advanceTimersByTimeAsync(5000);

    expect(relayOutboxMock).toHaveBeenCalledTimes(2);

    stop();
  });

  it("handles relay errors gracefully", async () => {
    const error = new Error("relay failed");
    const relayOutboxMock = vi.fn().mockRejectedValue(error);
    const adminServiceMock = { relayOutbox: relayOutboxMock } as unknown as Parameters<
      typeof startOutboxRelayWorker
    >[0];

    const stop = startOutboxRelayWorker(adminServiceMock, 1000);

    await vi.advanceTimersByTimeAsync(1000);

    expect(relayOutboxMock).toHaveBeenCalled();

    stop();
  });
});
