// Integration tests for POST /api/internal/token/verify.
//
// Validates the server-to-server token verification endpoint end-to-end,
// covering the shared secret guard and all response shapes.

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

// ---------------------------------------------------------------------------
// Environment mock — controls INTERNAL_SECRET per test
// ---------------------------------------------------------------------------

const VALID_SECRET = "a-valid-internal-secret-32chars!"; // exactly 32 chars

// vi.hoisted so the object reference is available inside the vi.mock factory.
const mockEnv = vi.hoisted(() => ({
  INTERNAL_SECRET: "a-valid-internal-secret-32chars!" as string | undefined,
  NODE_ENV: "test",
  PORT: "4001",
  LOG_LEVEL: "warn",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  ALLOWED_ORIGINS: "http://localhost:3000",
  REDIS_URL: undefined,
  COOKIE_SECRET: undefined,
  SENTRY_DSN: undefined,
  SENTRY_ENVIRONMENT: undefined,
  SENTRY_TRACES_SAMPLE_RATE: "0.1",
  LOG_FILE: undefined,
}));

vi.mock("../../src/config/env.js", () => ({ env: mockEnv }));

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockGetUserResult: {
  data: { user: object | null };
  error: null | { message: string };
} = {
  data: {
    user: {
      id: "user-uuid-123",
      email: "service@example.com",
      app_metadata: { role: "admin" },
    },
  },
  error: null,
};

vi.mock("../../src/supabase/index.js", () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {
      select:      vi.fn(),
      eq:          vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    (c.select as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.eq    as ReturnType<typeof vi.fn>).mockReturnValue(c);
    return c;
  };

  return {
    createServiceRoleClient: () => ({
      auth: {
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
        admin: { signOut: vi.fn().mockResolvedValue({ error: null }) },
      },
      from: vi.fn().mockImplementation(() => makeChain()),
    }),
    createAnonClient:   () => ({ auth: { refreshSession: vi.fn() } }),
    createServerClient: () => ({ auth: {} }),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockEnv.INTERNAL_SECRET = VALID_SECRET;
  mockGetUserResult = {
    data: {
      user: {
        id: "user-uuid-123",
        email: "service@example.com",
        app_metadata: { role: "admin" },
      },
    },
    error: null,
  };
});

describe("POST /api/internal/token/verify — valid secret", () => {
  it("returns { valid: true, user } for a token Supabase accepts", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/internal/token/verify")
      .set("x-internal-secret", VALID_SECRET)
      .send({ token: "any.valid.jwt" });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.user).toHaveProperty("id", "user-uuid-123");
    expect(res.body.user).toHaveProperty("role", "admin");
  });

  it("returns { valid: false, error } when Supabase rejects the token", async () => {
    mockGetUserResult = {
      data: { user: null },
      error: { message: "JWT is invalid or expired" },
    };

    const app = createApp();
    const res = await request(app)
      .post("/api/internal/token/verify")
      .set("x-internal-secret", VALID_SECRET)
      .send({ token: "bad.jwt.token" });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when the token field is missing from the request body", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/internal/token/verify")
      .set("x-internal-secret", VALID_SECRET)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /api/internal/token/verify — wrong or missing secret", () => {
  it("returns 401 when x-internal-secret header is incorrect", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/internal/token/verify")
      .set("x-internal-secret", "wrong-secret-value")
      .send({ token: "any.token" });

    expect(res.status).toBe(401);
  });

  it("returns 401 when x-internal-secret header is absent", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/internal/token/verify")
      .send({ token: "any.token" });

    expect(res.status).toBe(401);
  });

  it("returns 404 when INTERNAL_SECRET is not configured", async () => {
    mockEnv.INTERNAL_SECRET = undefined;

    const app = createApp();
    const res = await request(app)
      .post("/api/internal/token/verify")
      .set("x-internal-secret", VALID_SECRET)
      .send({ token: "any.token" });

    expect(res.status).toBe(404);
  });
});
