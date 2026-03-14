// Unit tests for the authenticate and requestIdMiddleware middlewares.
//
// These tests inject mock req/res/next objects to verify the middleware
// in isolation — no HTTP server or real Supabase calls.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requestIdMiddleware, authenticate } from "../../src/middleware/authenticate.js";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// vi.hoisted ensures this mock fn is available inside the vi.mock factory (hoisting TDZ workaround).
const touchSessionActivityMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

let mockValidateResult: { valid: boolean; user?: object; error?: string } = {
  valid: true,
  user: {
    id: "user-123",
    email: "user@example.com",
    role: "trade",
    stepUpVerified: false,
    expiresAt: Math.floor(Date.now() / 1000) + 900,
  },
};

vi.mock("../../src/auth/session.service.js", () => ({
  validateToken: vi.fn().mockImplementation(() => Promise.resolve(mockValidateResult)),
  touchSessionActivity: touchSessionActivityMock,
  decodeJwtPayload: vi.fn().mockReturnValue({ session_id: "sess-unit-1" }),
}));

vi.mock("../../src/observability/events.js", () => ({
  emitSecurityEvent: vi.fn(),
}));

vi.mock("../../src/observability/logger.js", () => ({
  createRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  authLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Builds minimal mock req/res/next objects.
function mockContext(opts: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  requestId?: string;
} = {}) {
  const req = {
    cookies:   opts.cookies ?? {},
    headers:   opts.headers ?? {},
    ip:        "127.0.0.1",
    requestId: opts.requestId ?? "test-req-id",
    user:      undefined,
  } as unknown as Request;

  const statusMock = vi.fn().mockReturnThis();
  const jsonMock   = vi.fn();
  const res  = { status: statusMock, json: jsonMock } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next, statusMock, jsonMock };
}

// ---------------------------------------------------------------------------
// requestIdMiddleware
// ---------------------------------------------------------------------------

describe("requestIdMiddleware", () => {
  it("uses x-request-id header when present", () => {
    const { req, res, next } = mockContext({ headers: { "x-request-id": "upstream-id-1" } });
    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe("upstream-id-1");
    expect(next).toHaveBeenCalledOnce();
  });

  it("generates a UUID when x-request-id header is absent", () => {
    const { req, res, next } = mockContext({ headers: {} });
    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(next).toHaveBeenCalledOnce();
  });

  it("always calls next regardless of header value", () => {
    const { req, res, next } = mockContext({ headers: { "x-request-id": "" } });
    requestIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// authenticate — valid token path
// ---------------------------------------------------------------------------

describe("authenticate — valid token", () => {
  beforeEach(() => {
    mockValidateResult = {
      valid: true,
      user: {
        id: "user-123",
        email: "user@example.com",
        role: "trade",
        stepUpVerified: false,
        expiresAt: Math.floor(Date.now() / 1000) + 900,
      },
    };
  });

  it("attaches req.user and calls next() on a valid token", async () => {
    const { req, res, next } = mockContext({
      cookies: { "sb-access-token": "valid.jwt.token" },
    });

    await authenticate(req, res, next);

    expect(req.user).toBeDefined();
    expect((req.user as { id: string }).id).toBe("user-123");
    expect((req.user as { role: string }).role).toBe("trade");
    expect(next).toHaveBeenCalledOnce();
  });

  it("calls touchSessionActivity with the session_id from the decoded JWT", async () => {
    touchSessionActivityMock.mockClear();
    const { req, res, next } = mockContext({
      cookies: { "sb-access-token": "valid.jwt.token" },
    });

    await authenticate(req, res, next);

    expect(touchSessionActivityMock).toHaveBeenCalledWith("sess-unit-1");
  });
});

// ---------------------------------------------------------------------------
// authenticate — missing token
// ---------------------------------------------------------------------------

describe("authenticate — missing token", () => {
  it("returns 401 TOKEN_MISSING when no sb-access-token cookie is present", async () => {
    const { req, res, next, statusMock, jsonMock } = mockContext({ cookies: {} });

    await authenticate(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TOKEN_MISSING" }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// authenticate — validation failures
// ---------------------------------------------------------------------------

describe("authenticate — token validation failures", () => {
  it("returns 401 TOKEN_EXPIRED when validateToken returns token_expired", async () => {
    mockValidateResult = { valid: false, error: "token_expired" };
    const { req, res, next, statusMock, jsonMock } = mockContext({
      cookies: { "sb-access-token": "expired.token" },
    });

    await authenticate(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TOKEN_EXPIRED" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 SESSION_REVOKED when validateToken returns session_revoked", async () => {
    mockValidateResult = { valid: false, error: "session_revoked" };
    const { req, res, next, statusMock, jsonMock } = mockContext({
      cookies: { "sb-access-token": "revoked.token" },
    });

    await authenticate(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SESSION_REVOKED" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 TOKEN_INVALID for token_invalid errors", async () => {
    mockValidateResult = { valid: false, error: "token_invalid" };
    const { req, res, next, statusMock, jsonMock } = mockContext({
      cookies: { "sb-access-token": "bad.token" },
    });

    await authenticate(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TOKEN_INVALID" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 TOKEN_INVALID for role_claim_missing errors", async () => {
    mockValidateResult = { valid: false, error: "role_claim_missing" };
    const { req, res, next, statusMock } = mockContext({
      cookies: { "sb-access-token": "no-role.token" },
    });

    await authenticate(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
