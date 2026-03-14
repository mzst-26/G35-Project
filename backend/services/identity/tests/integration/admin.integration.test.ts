// Integration tests for admin-only routes.
//
// Covers POST /api/auth/admin/revoke and POST /api/auth/admin/users.
// Both routes require authenticate (admin role) + authorise guard.

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

// CSRF double-submit values shared across tests.
const CSRF_VALUE  = "test-csrf-token-for-admin-tests";
const CSRF_COOKIE = `csrf-token=${CSRF_VALUE}`;

// Builds a minimal fake JWT with the given payload.
// decodeJwtPayload() reads base64url-encoded part[1] of a JWT.
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body   = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesig`;
}

// Admin token carries aal2 so that step-up MFA guard (users:ban, users:create) passes.
const ADMIN_JWT = fakeJwt({ aal: "aal2", session_id: "admin-sess-1" });

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockGetUserResult: {
  data: { user: object | null };
  error: null | { message: string };
} = {
  data: {
    user: {
      id: "admin-uuid-1",
      email: "admin@example.com",
      app_metadata: { role: "admin" },
    },
  },
  error: null,
};

const createUserMock = vi.fn().mockResolvedValue({
  data: {
    user: {
      id: "new-user-uuid-1",
      email: "worker@example.com",
      app_metadata: { role: "trade" },
    },
  },
  error: null,
});

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
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
        admin: {
          signOut:    vi.fn().mockResolvedValue({ error: null }),
          createUser: createUserMock,
        },
      },
      from: vi.fn().mockImplementation(() => makeChain()),
    }),
    createAnonClient:   () => ({ auth: { refreshSession: vi.fn() } }),
    createServerClient: () => ({
      auth: { getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)) },
    }),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGetUserResult = {
    data: {
      user: {
        id: "admin-uuid-1",
        email: "admin@example.com",
        app_metadata: { role: "admin" },
      },
    },
    error: null,
  };
  createUserMock.mockResolvedValue({
    data: {
      user: {
        id: "new-user-uuid-1",
        email: "worker@example.com",
        app_metadata: { role: "trade" },
      },
    },
    error: null,
  });
});

describe("POST /api/auth/admin/revoke", () => {
  it("returns 204 when an admin revokes a user's sessions", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/revoke")
      .set("Cookie", `sb-access-token=${ADMIN_JWT}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ userId: "11111111-1111-1111-1111-111111111111" });

    expect(res.status).toBe(204);
  });

  it("returns 400 when userId is not a valid UUID", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/revoke")
      .set("Cookie", `sb-access-token=${ADMIN_JWT}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ userId: "not-a-uuid" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when no auth cookie is present", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/revoke")
      .set("Cookie", CSRF_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ userId: "11111111-1111-1111-1111-111111111111" });

    expect(res.status).toBe(401);
  });

  it("returns 403 when a non-admin user attempts revocation", async () => {
    // Switch the token to a recruiter role — doesn't have users:ban permission.
    mockGetUserResult = {
      data: {
        user: {
          id: "recruiter-uuid-1",
          email: "recruiter@example.com",
          app_metadata: { role: "recruiter" },
        },
      },
      error: null,
    };
    // Recruiter token — aal2 doesn't matter here since permission check fails first.
    const recruiterJwt = fakeJwt({ aal: "aal2", session_id: "rec-sess-1" });

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/revoke")
      .set("Cookie", `sb-access-token=${recruiterJwt}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ userId: "11111111-1111-1111-1111-111111111111" });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/admin/users", () => {
  it("returns 201 with userId, email, role when provisioning succeeds", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/users")
      .set("Cookie", `sb-access-token=${ADMIN_JWT}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ email: "worker@example.com", role: "trade" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("userId");
    expect(res.body).toHaveProperty("email");
    expect(res.body.role).toBe("trade");
  });

  it("returns 400 when email is invalid", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/users")
      .set("Cookie", `sb-access-token=${ADMIN_JWT}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ email: "not-an-email", role: "trade" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when role is not one of the valid values", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/users")
      .set("Cookie", `sb-access-token=${ADMIN_JWT}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ email: "worker@example.com", role: "superuser" });

    expect(res.status).toBe(400);
  });

  it("returns 403 when a non-admin user attempts provisioning", async () => {
    mockGetUserResult = {
      data: {
        user: {
          id: "trade-uuid-1",
          email: "worker@example.com",
          app_metadata: { role: "trade" },
        },
      },
      error: null,
    };
    const tradeJwt = fakeJwt({ aal: "aal1", session_id: "trade-sess-1" });

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/admin/users")
      .set("Cookie", `sb-access-token=${tradeJwt}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ email: "new@example.com", role: "trade" });

    expect(res.status).toBe(403);
  });
});
