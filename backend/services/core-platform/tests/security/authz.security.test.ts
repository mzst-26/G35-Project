import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

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

describe("security authn/authz", () => {
  it("returns 401 for unauthenticated request", async () => {
    const app = await createApp();
    const res = await request(app).get("/api/v1/jobs");
    expect(res.status).toBe(401);
  });

  it("returns 401 for expired/invalid token", async () => {
    verifyTokenMock.mockRejectedValueOnce(new Error("expired"));
    const app = await createApp();
    const res = await request(app).get("/api/v1/jobs").set("Authorization", "Bearer expired");
    expect(res.status).toBe(401);
  });

  it("returns 403 when role lacks permission for the operation", async () => {
    verifyTokenMock.mockResolvedValueOnce({
      userId: "t1",
      email: "trade@example.com",
      role: "trade",
    });
    const app = await createApp();
    const res = await request(app).post("/api/v1/jobs").set("Authorization", "Bearer ok");
    expect(res.status).toBe(403);
  });
});
