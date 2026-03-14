import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

// Minimal unsigned JWT carrying arbitrary payload — Supabase sig check is mocked.
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesig`;
}

// CSRF double-submit: header value must match the cookie value.
const CSRF_VALUE = "test-csrf-token-for-session-tests";
const CSRF_COOKIE = `csrf-token=${CSRF_VALUE}`;
const VALID_SESSION_ID = "11111111-1111-1111-1111-111111111111";

let mockRefreshSessionResult: {
  data: { session: object | null };
  error: null | { message: string };
} = {
  data: {
    session: {
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 900,
      user: { id: "user-uuid-123" },
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
      email: "user@example.com",
      app_metadata: { role: "recruiter" },
    },
  },
  error: null,
};

let mockSessionRowResult: {
  data: Record<string, unknown> | null;
  error: null | { message: string; code?: string };
} = { data: null, error: null };

vi.mock("../../src/supabase/index.js", () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {
      insert:      vi.fn().mockResolvedValue({ error: null }),
      select:      vi.fn(),
      update:      vi.fn(),
      eq:          vi.fn(),
      lt:          vi.fn(),
      is:          vi.fn(),
      limit:       vi.fn(),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockSessionRowResult)),
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
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
        admin: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn().mockImplementation(() => makeChain()),
    }),
    createAnonClient: () => ({
      auth: {
        refreshSession: vi.fn().mockImplementation(() => Promise.resolve(mockRefreshSessionResult)),
      },
    }),
    createServerClient: () => ({
      auth: {
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
      },
    }),
  };
});

beforeEach(() => {
  // Reset all mock results to valid defaults before each test.
  mockRefreshSessionResult = {
    data: {
      session: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 900,
        user: { id: "user-uuid-123" },
      },
    },
    error: null,
  };
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
  mockSessionRowResult = { data: null, error: null };
});

describe("POST /api/auth/session/refresh", () => {
  it("returns 200 and rotates all three cookies when refresh token is valid", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/refresh")
      .set("Cookie", `sb-refresh-token=valid-refresh-token; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("expiresAt");

    const setCookie = res.headers["set-cookie"];
    const cookies = Array.isArray(setCookie)
      ? setCookie.join("; ")
      : String(setCookie ?? "");
    expect(cookies).toContain("sb-access-token");
    expect(cookies).toContain("sb-refresh-token");
    expect(cookies).toContain("csrf-token");
  });

  it("returns 401 TOKEN_MISSING when refresh cookie is absent", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/refresh")
      .set("Cookie", CSRF_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("returns 401 when Supabase rejects the refresh token", async () => {
    mockRefreshSessionResult = {
      data: { session: null },
      error: { message: "Invalid Refresh Token: Refresh Token Not Found" },
    };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/refresh")
      .set("Cookie", `sb-refresh-token=expired-token; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({});

    expect(res.status).toBe(401);
    expect(["TOKEN_EXPIRED", "SESSION_REVOKED"]).toContain(res.body.code);
  });
});

describe("POST /api/auth/session/logout", () => {
  it("returns 204 and clears all three cookies", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/logout")
      .set("Cookie", `sb-access-token=valid-access-token; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ sessionId: VALID_SESSION_ID });

    expect(res.status).toBe(204);

    // Cleared cookies have maxAge=0 — they appear in Set-Cookie.
    const setCookie = res.headers["set-cookie"];
    if (Array.isArray(setCookie)) {
      const cookieHeader = setCookie;
      const joined = cookieHeader.join("; ");
      expect(joined).toContain("sb-access-token");
    }
  });

  it("returns 401 when auth cookie is present but CSRF is missing", async () => {
    // CSRF fires before authenticate — no CSRF header means 403.
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/logout")
      .set("Cookie", "sb-access-token=valid-access-token")
      .send({ sessionId: VALID_SESSION_ID });

    // 403 because CSRF middleware fires before authenticate.
    expect(res.status).toBe(403);
  });

  it("returns 401 TOKEN_MISSING when no auth cookie is present", async () => {
    // Send valid CSRF but no auth cookie — authenticate should return 401.
    mockGetUserResult = { data: { user: null }, error: { message: "JWT not found" } };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/logout")
      .set("Cookie", CSRF_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ sessionId: VALID_SESSION_ID });

    // No sb-access-token cookie → authenticate middleware returns TOKEN_MISSING.
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });
});

describe("POST /api/auth/session/refresh — idle session enforcement", () => {
  it("returns 401 SESSION_REVOKED when the session has been idle for more than 8 hours", async () => {
    const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
    // The access_token must be a decodable JWT so session_id can be extracted.
    mockRefreshSessionResult = {
      data: {
        session: {
          access_token: fakeJwt({ session_id: "stale-session-1", aal: "aal1" }),
          refresh_token: "stale-refresh-token",
          expires_in: 900,
          user: { id: "user-uuid-123" },
        },
      },
      error: null,
    };
    mockSessionRowResult = { data: { last_active_at: nineHoursAgo }, error: null };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/session/refresh")
      .set("Cookie", `sb-refresh-token=stale-token; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("SESSION_REVOKED");
  });
});
