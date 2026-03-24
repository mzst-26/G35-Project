import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyTokenMock = vi.fn();

vi.mock("@infra/shared-auth", async () => {
  const actual = await vi.importActual<typeof import("@infra/shared-auth")>("@infra/shared-auth");
  return {
    ...actual,
    verifyToken: verifyTokenMock,
  };
});

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    requestId: "req-1",
  } as unknown as Request;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("authenticate middleware", () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls next(UnauthorisedError) when Authorization header is missing", async () => {
    const { authenticate } = await import("../../src/middleware/authenticate.js");
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const [err] = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(err.code).toBe("UNAUTHORISED");
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("returns next(UnauthorisedError) when token is invalid", async () => {
    const { authenticate } = await import("../../src/middleware/authenticate.js");
    verifyTokenMock.mockRejectedValue(new Error("invalid"));

    const req = makeReq("Bearer bad.token");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const [err] = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(err.code).toBe("UNAUTHORISED");
  });

  it("attaches req.user for valid token", async () => {
    const { authenticate } = await import("../../src/middleware/authenticate.js");
    verifyTokenMock.mockResolvedValue({
      userId: "u-1",
      email: "a@b.com",
      role: "admin",
    });

    const req = makeReq("Bearer good.token");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);

    expect((req as unknown as { user?: unknown }).user).toBeDefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
