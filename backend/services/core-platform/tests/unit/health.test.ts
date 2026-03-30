import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

vi.mock("@infra/shared-db", async () => {
  const actual = await vi.importActual<typeof import("@infra/shared-db")>("@infra/shared-db");
  return {
    ...actual,
    checkDbHealth: vi.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
  };
});

describe("core platform health", () => {
  it("returns service health", async () => {
    const { app } = await createApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.kind).toBe("ready");
    expect(response.body.service).toBe("core-platform");
    expect(response.body.checks.db).toEqual({ ok: true, latencyMs: 10 });
  });
});
