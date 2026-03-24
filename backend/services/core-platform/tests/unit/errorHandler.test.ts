import type { Request, Response, NextFunction } from "express";
import { describe, expect, it, vi } from "vitest";
import { globalErrorHandler } from "../../src/middleware/errorHandler.js";
import { BaseApiError } from "@infra/shared-errors";
import { z } from "zod";

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeReq(): Request {
  return { requestId: "req-1", path: "/x", method: "GET" } as unknown as Request;
}

describe("globalErrorHandler", () => {
  it("serialises BaseApiError correctly", () => {
    const err = new BaseApiError("BAD_REQUEST", "Bad request", 400);
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    globalErrorHandler(err, req, res, next);
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    expect((res.json as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: { code: "BAD_REQUEST", message: "Bad request" },
    });
  });

  it("serialises Zod errors as 400 with field messages", () => {
    const schema = z.object({ id: z.string().uuid() });
    const parsed = schema.safeParse({ id: "bad" });
    if (parsed.success) throw new Error("expected zod error");

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    globalErrorHandler(parsed.error, req, res, next);

    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    const payload = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(payload.error.issues)).toBe(true);
  });

  it("returns 500 for unknown errors", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    globalErrorHandler(new Error("boom"), req, res, next);
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500);
    expect((res.json as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });
});
