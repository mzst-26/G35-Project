// Integration tests for the identity service auth endpoints.
//
// These tests exercise the full HTTP request→middleware→service stack.
// The Supabase client is mocked at the factory level so no real credentials
// are required. This validates:
//   - Request validation (Zod schemas)
//   - Cookie handling logic
//   - Error mapping (service errors → HTTP responses)
//   - Middleware behavior (rate limiting, authenticate)

import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

// ---------------------------------------------------------------------------
// Supabase factory mocks
// ---------------------------------------------------------------------------

// We mock the entire supabase barrel. Each factory returns a chainable mock
// that can be customised per test via the exported variables below.

let mockSignInWithOtpResult: { error: null | { message: string; code?: string } } = { error: null };
let mockVerifyOtpResult: {
  data: { session: object | null; user: object | null };
  error: null | { message: string };
} = {
  data: {
    session: {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 900,
    },
    user: {
      id: "user-uuid-123",
      email: "test@example.com",
      app_metadata: { role: "trade" },
    },
  },
  error: null,
};
let mockGetUserResult: {
  data: { user: object | null };
  error: null | { message: string };
} = {
  data: {
    user: {
      id: "user-uuid-123",
      email: "test@example.com",
      app_metadata: { role: "trade" },
    },
  },
  error: null,
};

vi.mock("../../src/supabase/index.js", () => {
  // Shared query-builder chain — all DB paths resolve to no-error.
  const makeChain = () => {
    const c: Record<string, unknown> = {
      insert:      vi.fn().mockResolvedValue({ error: null }),
      select:      vi.fn(),
      update:      vi.fn(),
      eq:          vi.fn(),
      lt:          vi.fn(),
      is:          vi.fn(),
      limit:       vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
    };
    (c.select as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.update as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.eq     as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.lt     as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.is     as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.limit  as ReturnType<typeof vi.fn>).mockReturnValue(c);
    return c;
  };

  return {
    createServiceRoleClient: () => ({
      auth: {
        signInWithOtp: vi.fn().mockImplementation(() => Promise.resolve(mockSignInWithOtpResult)),
        admin: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
          mfa: {
            listFactors: vi.fn().mockResolvedValue({ data: { factors: [] }, error: null }),
          },
        },
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
      },
      from: vi.fn().mockImplementation(() => makeChain()),
    }),
    createAnonClient: () => ({
      auth: {
        verifyOtp: vi.fn().mockImplementation(() => Promise.resolve(mockVerifyOtpResult)),
        refreshSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_in: 900,
              user: { id: "user-uuid-123" },
            },
          },
          error: null,
        }),
      },
    }),
    createServerClient: () => ({
      auth: {
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
        mfa: {
          listFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
          enroll: vi.fn(),
          challenge: vi.fn(),
          verify: vi.fn(),
          unenroll: vi.fn(),
        },
      },
    }),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/otp/request", () => {
  it("returns 200 with messageId when email is valid", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/request")
      .send({ email: "user@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("messageId");
    expect(typeof res.body.messageId).toBe("string");
  });

  it("returns 400 when email is missing", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/request")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when email format is invalid", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/request")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 even when Supabase returns an error (enumeration protection)", async () => {
    mockSignInWithOtpResult = { error: { message: "Email not found", code: "email_not_found" } };
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/request")
      .send({ email: "unknown@example.com" });

    // Must still return 200 — never leak whether the email is registered.
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("messageId");
    mockSignInWithOtpResult = { error: null }; // reset
  });
});

describe("POST /api/auth/otp/verify", () => {
  it("returns 200 with user and sets cookies on valid OTP", async () => {
    mockVerifyOtpResult = {
      data: {
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 900,
        },
        user: {
          id: "user-uuid-123",
          email: "user@example.com",
          app_metadata: { role: "trade" },
        },
      },
      error: null,
    };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "user@example.com", token: "123456" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("sessionId");
    expect(res.body.user.role).toBe("trade");

    // Session cookies must be present.
    const cookies = res.headers["set-cookie"] as string[] | string;
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toContain("sb-access-token");
    expect(cookieStr).toContain("HttpOnly");
  });

  it("returns 401 when Supabase rejects the OTP", async () => {
    mockVerifyOtpResult = {
      data: { session: null, user: null },
      error: { message: "Token has expired or is invalid" },
    };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "user@example.com", token: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("OTP_INVALID");
  });

  it("returns 400 when token is not 6 digits", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "user@example.com", token: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when user has no recognised role", async () => {
    mockVerifyOtpResult = {
      data: {
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 900,
        },
        user: {
          id: "user-uuid-123",
          email: "user@example.com",
          app_metadata: { role: "unknown_role" },
        },
      },
      error: null,
    };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "user@example.com", token: "123456" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ROLE_NOT_RECOGNISED");
  });
});

describe("GET /api/auth/session/me", () => {
  it("returns 401 with TOKEN_MISSING when no cookie is present", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/session/me");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("returns 200 with user when a valid token cookie is present", async () => {
    mockGetUserResult = {
      data: {
        user: {
          id: "user-uuid-123",
          email: "user@example.com",
          app_metadata: { role: "recruiter" },
        },
      },
      error: null,
    };

    const app = createApp();
    const res = await request(app)
      .get("/api/auth/session/me")
      .set("Cookie", "sb-access-token=mock-valid-token");

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("recruiter");
    expect(res.body.user.id).toBe("user-uuid-123");
  });

  it("returns 401 when Supabase rejects the token", async () => {
    mockGetUserResult = {
      data: { user: null },
      error: { message: "JWT is invalid or expired" },
    };

    const app = createApp();
    const res = await request(app)
      .get("/api/auth/session/me")
      .set("Cookie", "sb-access-token=bad-token");

    expect(res.status).toBe(401);
    expect(["TOKEN_INVALID", "TOKEN_EXPIRED"]).toContain(res.body.code);
  });
});

describe("GET /health", () => {
  it("returns 200 with service status", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("identity");
  });
});

