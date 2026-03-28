// Integration tests for MFA routes.
// Every mutating request needs CSRF double-submit (csrf-token cookie + x-csrf-token header).
// GET /factors only needs the auth cookie. POST/DELETE routes without CSRF get 403.

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

// Real UUIDs — validators.ts uses z.string().uuid() so placeholder strings fail.
const FACTOR_UUID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CHALLENGE_UUID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const CSRF_VALUE = "test-csrf-token-for-mfa-tests";
const AUTH_COOKIE = "sb-access-token=valid-access-token";
const CSRF_COOKIE = `csrf-token=${CSRF_VALUE}`;
const SESSION_COOKIE = `${AUTH_COOKIE}; ${CSRF_COOKIE}`;

const mockUser = {
  id: "user-uuid-123",
  email: "user@example.com",
  app_metadata: { role: "recruiter" },
};

// Module-level mocks — reset in beforeEach to prevent state leaking between tests.
let mockEnrollResult: { data: object | null; error: null | { message: string } } = {
  data: {
    id: FACTOR_UUID,
    type: "totp",
    totp: { qr_code: "data:image/png;base64,abc", secret: "BASE32SECRET", uri: "otpauth://..." },
    friendly_name: "My Authenticator",
    status: "unverified",
  },
  error: null,
};

let mockListFactorsResult: {
  data: { totp: object[] } | null;
  error: null | { message: string };
} = {
  data: { totp: [] },
  error: null,
};

vi.mock("../../src/supabase/index.js", () => ({
  createServiceRoleClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockUser }, error: null }),
      ),
      admin: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
  createAnonClient: () => ({
    auth: {
      verifyOtp: vi.fn(),
      refreshSession: vi.fn(),
    },
  }),
  createServerClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockUser }, error: null }),
      ),
      mfa: {
        listFactors: vi.fn().mockImplementation(() => Promise.resolve(mockListFactorsResult)),
        enroll: vi.fn().mockImplementation(() => Promise.resolve(mockEnrollResult)),
        challenge: vi.fn().mockResolvedValue({
          data: { id: CHALLENGE_UUID, expires_at: 1800000000 },
          error: null,
        }),
        verify: vi.fn().mockResolvedValue({
          data: {
            access_token: "aal2-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 900,
          },
          error: null,
        }),
        unenroll: vi.fn().mockResolvedValue({
          data: { id: FACTOR_UUID },
          error: null,
        }),
      },
    },
  }),
}));

beforeEach(() => {
  // Reset to clean defaults before every test.
  mockListFactorsResult = { data: { totp: [] }, error: null };
  mockEnrollResult = {
    data: {
      id: FACTOR_UUID,
      type: "totp",
      totp: { qr_code: "data:image/png;base64,abc", secret: "BASE32SECRET", uri: "otpauth://..." },
      friendly_name: "My Authenticator",
      status: "unverified",
    },
    error: null,
  };
});

describe("MFA routes — unauthenticated", () => {
  // GET routes don't hit CSRF, so no cookie → 401 from authenticate middleware.
  it("GET /factors returns 401 with no cookie", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/mfa/factors");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  // POST without any cookies: CSRF fires first and returns 403 before authenticate runs.
  it("POST /enroll returns 403 with no cookie", async () => {
    const app = createApp();
    const res = await request(app).post("/api/auth/mfa/enroll").send({ type: "totp" });
    expect(res.status).toBe(403);
  });

  // Auth cookie present but CSRF missing → 403 from CSRF middleware.
  it("POST /enroll returns 403 when CSRF header is absent", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/enroll")
      .set("Cookie", AUTH_COOKIE)
      .send({ type: "totp" });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/auth/mfa/factors", () => {
  it("returns 200 with empty factor list when none enrolled", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/mfa/factors").set("Cookie", AUTH_COOKIE);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("factors");
    expect(Array.isArray(res.body.factors)).toBe(true);
  });

  it("returns enrolled factors with factorId field", async () => {
    // Service maps supabase `f.id` → `factorId` in the MfaFactor shape.
    mockListFactorsResult = {
      data: {
        totp: [
          {
            id: FACTOR_UUID,
            type: "totp",
            status: "verified",
            friendly_name: "My Authenticator",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
      error: null,
    };

    const app = createApp();
    const res = await request(app).get("/api/auth/mfa/factors").set("Cookie", AUTH_COOKIE);

    expect(res.status).toBe(200);
    const factors = Array.isArray(res.body)
      ? res.body
      : Array.isArray(res.body?.factors)
        ? res.body.factors
        : Array.isArray(res.body?.data?.factors)
          ? res.body.data.factors
          : [];

    expect(factors).toHaveLength(1);
    expect(factors[0].factorId ?? factors[0].id).toBe(FACTOR_UUID);
  });

  it("returns 409 when enroll is called and a verified factor already exists", async () => {
    mockListFactorsResult = {
      data: {
        totp: [
          {
            id: FACTOR_UUID,
            type: "totp",
            status: "verified",
            friendly_name: "Existing",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
      error: null,
    };

    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/enroll")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ type: "totp", friendlyName: "Duplicate" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/mfa/enroll", () => {
  it("returns 201 with TOTP enrollment data", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/enroll")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ type: "totp", friendlyName: "My Authenticator" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("factorId");
  });

  it("returns 400 when type is missing", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/enroll")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/mfa/challenge", () => {
  it("returns 201 with challengeId", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/challenge")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ factorId: FACTOR_UUID });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("challengeId");
  });

  it("returns 400 when factorId is not a valid UUID", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/challenge")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ factorId: "not-a-uuid" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/mfa/verify", () => {
  it("returns 200 and sets aal2 access-token cookie on valid code", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/auth/mfa/verify")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({
        factorId: FACTOR_UUID,
        challengeId: CHALLENGE_UUID,
        code: "123456",
      });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);

    const cookies = (res.headers["set-cookie"] as string[]).join("; ");
    expect(cookies).toContain("sb-access-token");
  });
});

describe("DELETE /api/auth/mfa/factors/:factorId", () => {
  it("returns 200 with revoked:true when factor is removed", async () => {
    const app = createApp();
    const res = await request(app)
      .delete(`/api/auth/mfa/factors/${FACTOR_UUID}`)
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE);

    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe(true);
  });

  it("returns 400 when factorId path param is not a valid UUID", async () => {
    const app = createApp();
    const res = await request(app)
      .delete("/api/auth/mfa/factors/not-a-uuid")
      .set("Cookie", SESSION_COOKIE)
      .set("x-csrf-token", CSRF_VALUE);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});
