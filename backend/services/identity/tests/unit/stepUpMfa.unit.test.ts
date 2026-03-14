// Unit tests for requireStepUpMfa and grantStepUp.
//
// The middleware has three pass conditions and two fail conditions:
//   pass: req.user.stepUpVerified === true  (aal2 token)
//   pass: grantStepUp(userId) called within the grace window
//   fail: no grant, no aal2 → 403 MFA_REQUIRED with challengeUrl
//   fail: grace period expired → 403
//   fail: no req.user → 401

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireStepUpMfa, grantStepUp } from "../../src/middleware/stepUpMfa.js";
import type { AuthenticatedUser } from "../../src/types/index.js";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-test-id",
    email: "user@example.com",
    role: "recruiter",
    stepUpVerified: false,
    expiresAt: Math.floor(Date.now() / 1000) + 900,
    ...overrides,
  };
}

function makeReq(user: AuthenticatedUser | undefined): Partial<Request> {
  return {
    user,
    requestId: "req-test-1",
    ip: "127.0.0.1",
    path: "/api/payments/initiate",
  } as Partial<Request>;
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("requireStepUpMfa", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls next() when req.user.stepUpVerified is true (aal2 token)", async () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser({ stepUpVerified: true })) as Request;
    const res = makeRes() as unknown as Response;

    await requireStepUpMfa()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next() when grantStepUp was called within the grace window", async () => {
    const next = vi.fn() as NextFunction;
    const user = makeUser({ id: "grace-user" });
    const req = makeReq(user) as Request;
    const res = makeRes() as unknown as Response;

    await grantStepUp(user.id);
    await requireStepUpMfa()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 MFA_REQUIRED with challengeUrl when no grant and no aal2", async () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(makeUser({ id: "no-grant-user" })) as Request;
    const res = makeRes() as unknown as Response;

    await requireStepUpMfa("/api/auth/mfa/challenge")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MFA_REQUIRED", challengeUrl: "/api/auth/mfa/challenge" }),
    );
  });

  it("returns 403 after the grace window expires", async () => {
    const next = vi.fn() as NextFunction;
    const user = makeUser({ id: "expired-grace-user" });
    const req = makeReq(user) as Request;
    const res = makeRes() as unknown as Response;

    await grantStepUp(user.id);
    // Advance past the 15-minute grace window.
    vi.advanceTimersByTime(16 * 60 * 1000);

    await requireStepUpMfa()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MFA_REQUIRED" }),
    );
  });

  it("returns 401 when req.user is not set", async () => {
    const next = vi.fn() as NextFunction;
    const req = makeReq(undefined) as Request;
    const res = makeRes() as unknown as Response;

    await requireStepUpMfa()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TOKEN_MISSING" }),
    );
  });
});
