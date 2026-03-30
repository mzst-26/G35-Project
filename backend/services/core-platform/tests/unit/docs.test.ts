import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@infra/shared-permissions";
import { createApp } from "../../src/app.js";

vi.mock("@infra/shared-auth", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "@infra/shared-auth";

function authHeader(token = "test-token"): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

describe("docs routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves openapi document", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "dev-user-id",
      email: "dev@example.com",
      role: "developer" as unknown as UserRole,
    });

    const { app } = await createApp({ startWorkers: false });
    const response = await request(app).get("/openapi.json").set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.1.0");
    expect(response.body.paths["/api/v1/jobs"]).toBeDefined();
  });

  it("serves custom docs page with endpoint and testability content", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "dev-user-id",
      email: "dev@example.com",
      role: "developer" as unknown as UserRole,
    });

    const { app } = await createApp({ startWorkers: false });
    const response = await request(app).get("/docs").set(authHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain("Core Platform API Documentation");
    expect(response.text).toContain("/api/v1/jobs");
    expect(response.text).toContain("Endpoints With Linked Tests");
    expect(response.text).toContain("tests/integration/jobs.integration.test.ts");
  });

  it("serves redoc docs page", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "dev-user-id",
      email: "dev@example.com",
      role: "developer" as unknown as UserRole,
    });

    const { app } = await createApp({ startWorkers: false });
    const response = await request(app).get("/docs/redoc").set(authHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain("redoc.standalone.js");
  });

  it("serves scalar docs page", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "dev-user-id",
      email: "dev@example.com",
      role: "developer" as unknown as UserRole,
    });

    const { app } = await createApp({ startWorkers: false });
    const response = await request(app).get("/docs/scalar").set(authHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain("@scalar/api-reference");
  });

  it("returns 403 for non-developer role", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "admin-user-id",
      email: "admin@example.com",
      role: UserRole.ADMIN,
    });

    const { app } = await createApp({ startWorkers: false });
    const response = await request(app).get("/docs").set(authHeader());

    expect(response.status).toBe(403);
  });

  it("returns 401 when no bearer token is provided", async () => {
    const { app } = await createApp({ startWorkers: false });
    const response = await request(app).get("/docs");

    expect(response.status).toBe(401);
  });
});
