// Unit tests for the authorise RBAC middleware factory.
//
// Tests the Express middleware directly using mock req/res/next objects
// so we don't need a full HTTP stack.

import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authorise } from "../../src/middleware/authorise.js";
import type { AuthenticatedUser } from "../../src/types/index.js";

// No Supabase calls in authorise — no mock needed.
// The RBAC policy is imported synchronously from rbac/policy.ts.

vi.mock("../../src/supabase/index.js", () => ({
  createServiceRoleClient: () => ({
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  }),
  createAnonClient: () => ({ auth: {} }),
  createServerClient: () => ({ auth: {} }),
}));

function makeUser(
  role: "admin" | "recruiter" | "trade",
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-uuid-1",
    email: "user@example.com",
    role,
    stepUpVerified: false,
    expiresAt: Math.floor(Date.now() / 1000) + 900,
    ...overrides,
  };
}

function makeReq(user: AuthenticatedUser | undefined): Partial<Request> {
  return { user, requestId: "req-123", ip: "127.0.0.1" } as Partial<Request>;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("authorise middleware", () => {
  it("calls next() when user has the required permission", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("recruiter")) as Request;
    const res = makeRes() as unknown as Response;

    authorise("jobs:create")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user does not have the required permission", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("trade")) as Request;
    const res = makeRes() as unknown as Response;

    authorise("jobs:create")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("allows admin to perform any action", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("admin")) as Request;
    const res = makeRes() as unknown as Response;

    authorise("jobs:create")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 when admin requests users:create without step-up MFA", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("admin", { stepUpVerified: false })) as Request;
    const res = makeRes() as unknown as Response;

    authorise("users:create")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows users:create when admin has completed step-up MFA", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("admin", { stepUpVerified: true })) as Request;
    const res = makeRes() as unknown as Response;

    authorise("users:create")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 401 when req.user is not set", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(undefined) as Request;
    const res = makeRes() as unknown as Response;

    authorise("jobs:read")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("trade can read jobs", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("trade")) as Request;
    const res = makeRes() as unknown as Response;

    authorise("jobs:read")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("trade cannot approve applications", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("trade")) as Request;
    const res = makeRes() as unknown as Response;

    authorise("applications:approve")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("authorise middleware — { any: [...] } overload", () => {
  it("passes when user has at least one of the listed permissions", () => {
    const next = vi.fn() as NextFunction;
    // trade has jobs:read but not jobs:create
    const req = makeReq(makeUser("trade")) as Request;
    const res = makeRes() as unknown as Response;

    authorise({ any: ["jobs:read", "jobs:create"] })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 when user has none of the listed permissions", () => {
    const next = vi.fn() as NextFunction;
    // stranger role does not exist here — use a fresh user with no matching perms
    const req = makeReq(makeUser("trade")) as Request;
    const res = makeRes() as unknown as Response;

    // trade does not have jobs:create or applications:approve
    authorise({ any: ["jobs:create", "applications:approve"] })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("passes when admin is checked against any partial permission set", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("admin")) as Request;
    const res = makeRes() as unknown as Response;

    authorise({ any: ["jobs:create", "jobs:delete"] })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe("authorise middleware — { all: [...] } overload", () => {
  it("passes only when user has every listed permission", () => {
    const next = vi.fn() as NextFunction;
    // admin has both jobs:create and jobs:delete
    const req = makeReq(makeUser("admin")) as Request;
    const res = makeRes() as unknown as Response;

    authorise({ all: ["jobs:create", "jobs:delete"] })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 when user is missing at least one required permission", () => {
    const next = vi.fn() as NextFunction;
    // recruiter has jobs:create but NOT users:ban
    const req = makeReq(makeUser("recruiter")) as Request;
    const res = makeRes() as unknown as Response;

    authorise({ all: ["jobs:create", "users:ban"] })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 403 when trade is missing all permissions", () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser("trade")) as Request;
    const res = makeRes() as unknown as Response;

    authorise({ all: ["users:ban", "users:delete"] })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
