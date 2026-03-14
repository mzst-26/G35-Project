import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

// Shared variable — the mock's `then` handler reads this at call time.
let mockDbError: { message: string; code: string } | null = null;

vi.mock("../../src/supabase/index.js", () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {
      select: vi.fn(),
      limit:  vi.fn(),
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: mockDbError }),
    };
    (c.select as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.limit  as ReturnType<typeof vi.fn>).mockReturnValue(c);
    return c;
  };

  return {
    createServiceRoleClient: () => ({
      auth: {},
      from: vi.fn().mockImplementation(() => makeChain()),
    }),
    createAnonClient:   () => ({ auth: {} }),
    createServerClient: () => ({ auth: {} }),
  };
});

describe("identity health", () => {
  it("returns 200 ok when Supabase is reachable", async () => {
    mockDbError = null;
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.service).toBe("identity");
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.supabase).toBe("ok");
  });

  it("returns 503 degraded when Supabase is unreachable", async () => {
    mockDbError = { message: "connection refused", code: "PGRST301" };
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.checks.supabase).toBe("error");

    mockDbError = null;
  });

  it("returns 200 ok for 42P01 — table absent before migration is not an outage", async () => {
    mockDbError = { message: "relation does not exist", code: "42P01" };
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");

    mockDbError = null;
  });
});
