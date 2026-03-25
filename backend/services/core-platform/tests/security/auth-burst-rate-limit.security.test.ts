import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const { verifyTokenMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
}));

vi.mock("@infra/shared-auth", async () => {
  const actual = await vi.importActual<typeof import("@infra/shared-auth")>("@infra/shared-auth");
  return {
    ...actual,
    verifyToken: verifyTokenMock,
  };
});

describe("auth burst pre-limiter", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.RATE_LIMIT_MAX_AUTH_BURST;
  });

  it("throttles invalid-token bursts before repeated auth verification", async () => {
    process.env.RATE_LIMIT_MAX_AUTH_BURST = "1";
    const rateLimit = await import("../../src/security/rateLimit.js");
    rateLimit.__resetRateLimitersForTests();

    verifyTokenMock.mockRejectedValue(new Error("invalid"));

    const { createApp } = await import("../../src/app.js");
    const { app } = await createApp();

    const first = await request(app)
      .get("/api/v1/jobs")
      .set("Authorization", "Bearer invalid");
    const second = await request(app)
      .get("/api/v1/jobs")
      .set("Authorization", "Bearer invalid");

    expect(first.status).toBe(401);
    expect(second.status).toBe(429);
    expect(verifyTokenMock).toHaveBeenCalledTimes(1);
  });
});
