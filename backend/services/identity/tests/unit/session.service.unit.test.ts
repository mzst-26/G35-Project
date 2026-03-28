// Unit tests for session service.
//
// Key behaviours tested:
//   - validateToken maps Supabase error messages to the correct error codes
//   - validateToken reads the `aal` claim from the JWT payload for stepUpVerified
//   - revokeSession uses 'local' scope for user revocation, 'global' for admin
//   - persistSession inserts a row and silently ignores 42P01 (table not yet created)
//   - touchSessionActivity calls the conditional update chain
//   - getSession returns the DB row when present, falls back to JWT-only when absent

import { describe, expect, it, vi } from "vitest";
import {
  validateToken,
  revokeSession,
  persistSession,
  touchSessionActivity,
  getSession,
  refreshSession,
} from "../../src/auth/session.service.js";
import type { Session } from "../../src/types/index.js";

// Builds a minimal JWT with the given payload (unsigned — signature is fake).
// validateToken decodes this AFTER Supabase verifies it, so invalid sig is fine here.
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesig`;
}

let mockGetUserResult: { data: { user: object | null }; error: null | { message: string } } = {
  data: {
    user: {
      id: "user-uuid-1",
      email: "user@example.com",
      app_metadata: { role: "trade" },
    },
  },
  error: null,
};

const adminSignOutMock = vi.fn().mockResolvedValue({ error: null });

let mockRefreshSessionResult: {
  data: { session: Record<string, unknown> | null };
  error: null | { message: string };
} = {
  data: {
    session: {
      access_token: "mock.access.token",
      refresh_token: "mock-refresh-token",
      expires_in: 900,
      user: { id: "user-uuid-1" },
    },
  },
  error: null,
};

// Per-test overrides for the from() chain — reset before each describe block.
let mockInsertResult: { error: null | { message: string; code: string } } = { error: null };
let mockMaybeSingleResult: { data: Record<string, unknown> | null; error: null | { message: string; code: string } } = { data: null, error: null };
let mockUpdateThenResult: { data: null; error: null | { message: string; code: string } } = { data: null, error: null };

// Reusable Supabase query-builder chain.
// Supports: insert, select/update/eq/lt/is/limit chains, and maybeSingle.
// The object is a "thenable" so direct `await chain` resolves via mockUpdateThenResult.
const makeChain = () => {
  const c: Record<string, unknown> = {
    insert:      vi.fn().mockImplementation(() => Promise.resolve(mockInsertResult)),
    select:      vi.fn(),
    update:      vi.fn(),
    eq:          vi.fn(),
    lt:          vi.fn(),
    is:          vi.fn(),
    limit:       vi.fn(),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockMaybeSingleResult)),
    then: (resolve: (v: unknown) => void) => resolve(mockUpdateThenResult),
  };
  (c.select as ReturnType<typeof vi.fn>).mockReturnValue(c);
  (c.update as ReturnType<typeof vi.fn>).mockReturnValue(c);
  (c.eq     as ReturnType<typeof vi.fn>).mockReturnValue(c);
  (c.lt     as ReturnType<typeof vi.fn>).mockReturnValue(c);
  (c.is     as ReturnType<typeof vi.fn>).mockReturnValue(c);
  (c.limit  as ReturnType<typeof vi.fn>).mockReturnValue(c);
  return c;
};

vi.mock("../../src/supabase/index.js", () => ({
  createServiceRoleClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
      admin: { signOut: adminSignOutMock },
    },
    from: vi.fn().mockImplementation(() => makeChain()),
  }),
  createAnonClient: () => ({
    auth: {
      refreshSession: vi.fn().mockImplementation(() => Promise.resolve(mockRefreshSessionResult)),
    },
  }),
  createServerClient: () => ({ auth: {} }),
}));

describe("validateToken — error code mapping", () => {
  it("returns { valid: false, error: 'token_missing' } for empty string", async () => {
    const result = await validateToken("");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("token_missing");
  });

  it("returns { valid: false, error: 'token_expired' } when Supabase says expired", async () => {
    mockGetUserResult = { data: { user: null }, error: { message: "JWT expired" } };
    const result = await validateToken(fakeJwt({ aal: "aal1" }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("token_expired");
  });

  it("returns { valid: false, error: 'token_invalid' } for generic Supabase error", async () => {
    mockGetUserResult = { data: { user: null }, error: { message: "invalid JWT" } };
    const result = await validateToken(fakeJwt({ aal: "aal1" }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("token_invalid");
  });

  it("returns { valid: false, error: 'role_not_recognised' } when role is unknown", async () => {
    mockGetUserResult = {
      data: {
        user: { id: "u1", email: "x@y.com", app_metadata: { role: "ghost" } },
      },
      error: null,
    };
    const result = await validateToken(fakeJwt({ aal: "aal1" }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("role_not_recognised");
  });
});

describe("validateToken — AAL2 / stepUpVerified", () => {
  it("sets stepUpVerified: false for aal1 tokens", async () => {
    mockGetUserResult = {
      data: { user: { id: "u1", email: "x@y.com", app_metadata: { role: "trade" } } },
      error: null,
    };
    const result = await validateToken(fakeJwt({ aal: "aal1" }));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.user.stepUpVerified).toBe(false);
  });

  it("sets stepUpVerified: true for aal2 tokens", async () => {
    mockGetUserResult = {
      data: { user: { id: "u1", email: "x@y.com", app_metadata: { role: "recruiter" } } },
      error: null,
    };
    const result = await validateToken(fakeJwt({ aal: "aal2" }));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.user.stepUpVerified).toBe(true);
  });

  it("defaults stepUpVerified: false when aal claim is absent", async () => {
    mockGetUserResult = {
      data: { user: { id: "u1", email: "x@y.com", app_metadata: { role: "admin" } } },
      error: null,
    };
    const result = await validateToken(fakeJwt({}));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.user.stepUpVerified).toBe(false);
  });
});

describe("revokeSession — scope selection", () => {
  it("calls signOut with scope local for user-initiated logout", async () => {
    adminSignOutMock.mockResolvedValue({ error: null });
    await revokeSession({ userId: "u1", sessionId: "s1" }, "user", "voluntary", "access-tok");
    expect(adminSignOutMock).toHaveBeenCalledWith("access-tok", "local");
  });

  it("calls signOut with scope global for admin revocation", async () => {
    adminSignOutMock.mockResolvedValue({ error: null });
    await revokeSession({ userId: "u1", sessionId: "s1" }, "admin", "suspicious", "access-tok");
    expect(adminSignOutMock).toHaveBeenCalledWith("access-tok", "global");
  });

  it("calls signOut with scope global for system revocation", async () => {
    adminSignOutMock.mockResolvedValue({ error: null });
    await revokeSession({ userId: "u1", sessionId: "s1" }, "system", "expired", "access-tok");
    expect(adminSignOutMock).toHaveBeenCalledWith("access-tok", "global");
  });
});
describe("persistSession — DB insert", () => {
  const sample: Session = {
    sessionId: "sess-uuid-1",
    userId: "user-uuid-1",
    role: "trade",
    createdAt: "2024-01-01T00:00:00.000Z",
    expiresAt: "2024-01-02T00:00:00.000Z",
    lastActiveAt: "2024-01-01T00:00:00.000Z",
    stepUpVerified: false,
    ipAddress: "1.2.3.4",
    userAgentHash: "abc123",
  };

  it("resolves without error when insert succeeds", async () => {
    mockInsertResult = { error: null };
    await expect(persistSession(sample)).resolves.toBeUndefined();
  });

  it("silently ignores 42P01 (table not yet created)", async () => {
    mockInsertResult = { error: { message: "relation does not exist", code: "42P01" } };
    await expect(persistSession(sample)).resolves.toBeUndefined();
  });

  it("does not throw for other DB errors — just logs a warning", async () => {
    mockInsertResult = { error: { message: "constraint violation", code: "23505" } };
    await expect(persistSession(sample)).resolves.toBeUndefined();
  });
});

describe("touchSessionActivity — conditional update", () => {
  it("resolves without error on a normal update (no rows need updating)", async () => {
    mockUpdateThenResult = { data: null, error: null };
    await expect(touchSessionActivity("sess-uuid-1")).resolves.toBeUndefined();
  });

  it("resolves without error when DB returns an error", async () => {
    mockUpdateThenResult = { data: null, error: { message: "connection timeout", code: "08006" } };
    // touchSessionActivity is fire-and-forget — must never throw
    await expect(touchSessionActivity("sess-uuid-1")).resolves.toBeUndefined();
  });
});

describe("getSession — DB row vs JWT fallback", () => {
  const validUser = {
    id: "user-uuid-1",
    email: "user@example.com",
    app_metadata: { role: "trade" },
  };

  // A fake JWT whose payload carries the session_id the DB lookup uses.
  function sessionJwt(sessionId: string) {
    return fakeJwt({ session_id: sessionId, aal: "aal1" });
  }

  it("returns the DB row when auth_sessions has a non-revoked record", async () => {
    mockGetUserResult = { data: { user: validUser }, error: null };
    mockMaybeSingleResult = {
      data: {
        session_id: "sess-db-1",
        user_id: "user-uuid-1",
        role: "trade",
        created_at: "2024-01-01T00:00:00.000Z",
        expires_at: "2024-01-02T00:00:00.000Z",
        last_active_at: "2024-01-01T00:00:00.000Z",
        ip_address: "1.2.3.4",
        user_agent_hash: "abc",
        revoked_at: null,
      },
      error: null,
    };

    const session = await getSession(sessionJwt("sess-db-1"));
    expect(session.sessionId).toBe("sess-db-1");
    expect(session.userId).toBe("user-uuid-1");
    expect(session.role).toBe("trade");
  });

  it("falls back to JWT reconstruction when maybeSingle returns null (pre-migration)", async () => {
    mockGetUserResult = { data: { user: validUser }, error: null };
    mockMaybeSingleResult = { data: null, error: null };

    const session = await getSession(sessionJwt("sess-jwt-only"));
    // Falls back to the JWT payload session_id
    expect(session.sessionId).toBe("sess-jwt-only");
    expect(session.userId).toBe("user-uuid-1");
  });

  it("throws SESSION_NOT_FOUND when validateToken fails", async () => {
    mockGetUserResult = { data: { user: null }, error: { message: "JWT expired" } };
    await expect(getSession(sessionJwt("any"))).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });
});

describe("refreshSession — token rotation", () => {
  it("throws TOKEN_MISSING when refreshToken is empty string", async () => {
    await expect(refreshSession({ refreshToken: "" })).rejects.toMatchObject({
      code: "TOKEN_MISSING",
    });
  });

  it("resolves with new tokens on a successful refresh (no session row)", async () => {
    mockRefreshSessionResult = {
      data: {
        session: {
          access_token: fakeJwt({ session_id: "sess-ok-1", aal: "aal1" }),
          refresh_token: "new-refresh-token",
          expires_in: 900,
          user: { id: "user-uuid-1" },
        },
      },
      error: null,
    };
    // No session row → idle check skipped gracefully.
    mockMaybeSingleResult = { data: null, error: null };

    const result = await refreshSession({ refreshToken: "valid-refresh-token" });
    expect(result.refreshToken).toBe("new-refresh-token");
    expect(typeof result.expiresAt).toBe("number");
    expect(result.expiresAt).toBeGreaterThan(0);
  });

  it("throws SESSION_REVOKED when Supabase returns a revoked error", async () => {
    mockRefreshSessionResult = {
      data: { session: null },
      error: { message: "Token has been revoked" },
    };
    await expect(refreshSession({ refreshToken: "revoked-token" })).rejects.toMatchObject({
      code: "SESSION_REVOKED",
    });
  });

  it("throws TOKEN_EXPIRED for generic Supabase refresh failures", async () => {
    mockRefreshSessionResult = {
      data: { session: null },
      error: { message: "JWT expired" },
    };
    await expect(refreshSession({ refreshToken: "expired-token" })).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
    });
  });
});

describe("refreshSession — idle session timeout (30-day enforcement)", () => {
  it("throws SESSION_REVOKED when session last_active_at exceeds 30 days", async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    mockRefreshSessionResult = {
      data: {
        session: {
          access_token: fakeJwt({ session_id: "idle-sess-1", aal: "aal1" }),
          refresh_token: "refresh-token",
          expires_in: 900,
          user: { id: "user-uuid-1" },
        },
      },
      error: null,
    };
    mockMaybeSingleResult = { data: { last_active_at: thirtyOneDaysAgo }, error: null };

    await expect(refreshSession({ refreshToken: "idle-refresh-token" })).rejects.toMatchObject({
      code: "SESSION_REVOKED",
    });
    // Admin signOut must have been called to invalidate the just-issued tokens.
    expect(adminSignOutMock).toHaveBeenCalled();
  });

  it("allows refresh when session was active within the last 30 days", async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    mockRefreshSessionResult = {
      data: {
        session: {
          access_token: fakeJwt({ session_id: "active-sess-1", aal: "aal1" }),
          refresh_token: "new-refresh-token",
          expires_in: 900,
          user: { id: "user-uuid-1" },
        },
      },
      error: null,
    };
    mockMaybeSingleResult = { data: { last_active_at: sevenDaysAgo }, error: null };

    const result = await refreshSession({ refreshToken: "active-refresh-token" });
    expect(result.refreshToken).toBe("new-refresh-token");
  });

  it("skips idle check gracefully when auth_sessions returns 42P01", async () => {
    mockRefreshSessionResult = {
      data: {
        session: {
          access_token: fakeJwt({ session_id: "pre-migration-sess", aal: "aal1" }),
          refresh_token: "new-refresh-token",
          expires_in: 900,
          user: { id: "user-uuid-1" },
        },
      },
      error: null,
    };
    // 42P01 — table not yet migrated.
    mockMaybeSingleResult = { data: null, error: { message: "relation does not exist", code: "42P01" } };

    await expect(refreshSession({ refreshToken: "any-token" })).resolves.toMatchObject({
      refreshToken: "new-refresh-token",
    });
  });
});