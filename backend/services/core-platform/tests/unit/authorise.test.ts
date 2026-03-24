import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { authorise } from "../../src/middleware/authorise.js";
import { Permission } from "@infra/shared-permissions";

function makeReq(role?: "admin" | "recruiter" | "trade"): Request {
  return {
    user: role
      ? {
          userId: "u1",
          email: "x@y.com",
          role,
        }
      : undefined,
  } as unknown as Request;
}

describe("authorise middleware", () => {
  it("calls next when permission is granted", () => {
    const middleware = authorise(Permission.ADMIN_WRITE);
    const req = makeReq("admin");
    const res = {} as Response;
    const next = ((arg?: unknown) => arg) as NextFunction;
    const result = middleware(req, res, next);
    expect(result).toBeUndefined();
  });

  it("returns 403 error when permission missing", () => {
    const middleware = authorise(Permission.ADMIN_WRITE);
    const req = makeReq("trade");
    const res = {} as Response;
    let captured: unknown;
    const next = ((arg?: unknown) => {
      captured = arg;
    }) as NextFunction;

    middleware(req, res, next);
    expect(captured).toBeDefined();
    expect((captured as { code?: string }).code).toBe("FORBIDDEN");
  });
});
