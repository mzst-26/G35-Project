import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

const { checkDbHealthMock } = vi.hoisted(() => ({
  checkDbHealthMock: vi.fn(),
}));

vi.mock("@infra/shared-db", async () => {
  const actual = await vi.importActual<typeof import("@infra/shared-db")>("@infra/shared-db");
  return {
    ...actual,
    checkDbHealth: checkDbHealthMock,
  };
});

describe("health endpoint integration", () => {
  beforeEach(() => {
    checkDbHealthMock.mockClear();
  });

  it("returns 200 with db check when db healthy", async () => {
    checkDbHealthMock.mockResolvedValue({ ok: true, latencyMs: 12 });
    const app = await createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe("ready");
    expect(res.body.checks.db).toEqual({ ok: true, latencyMs: 12 });
  });

  it("returns 503 degraded when db health fails", async () => {
    checkDbHealthMock.mockResolvedValue({ ok: false, latencyMs: 45 });
    const app = await createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.kind).toBe("ready");
  });

  it("GET /health/live is always 200 without hitting the database", async () => {
    checkDbHealthMock.mockRejectedValue(new Error("should not be called"));
    const app = await createApp();
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe("live");
    expect(res.body.service).toBe("core-platform");
    expect(checkDbHealthMock).not.toHaveBeenCalled();
  });

  it("GET /health/ready matches /health readiness behaviour", async () => {
    checkDbHealthMock.mockResolvedValue({ ok: true, latencyMs: 1 });
    const app = await createApp();
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe("ready");
    expect(res.body.checks.db).toEqual({ ok: true, latencyMs: 1 });
  });
});
