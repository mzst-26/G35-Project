// Unit tests for the global error handler middleware.
//
// Verifies correct HTTP status codes and response shapes for every
// BaseAuthError subclass and for untyped Error fallback.

import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { globalErrorHandler } from "../../src/middleware/errorHandler.js";
import {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  MfaRequiredError,
  RateLimitError,
  InternalAuthError,
} from "../../src/errors/index.js";

vi.mock("../../src/observability/logger.js", () => ({
  createRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    info:  vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
  })),
  authLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Builds minimal mock request/response/next for the error handler signature.
function mockContext() {
  const statusMock = vi.fn().mockReturnThis();
  const jsonMock   = vi.fn();
  const req  = { requestId: "test-req-id", user: undefined, headers: {} } as unknown as Request;
  const res  = { status: statusMock, json: jsonMock } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, statusMock, jsonMock };
}

describe("globalErrorHandler — typed BaseAuthError subclasses", () => {
  it("maps ValidationError to 400 with issues array", () => {
    const err = new ValidationError("Bad input", [{ field: "email", message: "Invalid email." }]);
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR", issues: expect.any(Array) }),
    );
  });

  it("maps AuthenticationError to 401 with the error's own code", () => {
    const err = new AuthenticationError("Token expired", "TOKEN_EXPIRED");
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TOKEN_EXPIRED" }),
    );
  });

  it("maps ForbiddenError to 403", () => {
    const err = new ForbiddenError("Insufficient permissions.", "users:ban");
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("maps MfaRequiredError to 403 and includes challengeUrl in the body", () => {
    const err = new MfaRequiredError("/api/auth/mfa/challenge");
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code:         "MFA_REQUIRED",
        challengeUrl: "/api/auth/mfa/challenge",
      }),
    );
  });

  it("maps RateLimitError to 429 and includes retryAfter", () => {
    const err = new RateLimitError(60);
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "RATE_LIMITED", retryAfter: 60 }),
    );
  });

  it("maps InternalAuthError to 500 with a generic message (no internal leak)", () => {
    const err = new InternalAuthError(new Error("database connection refused"));
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    const body = jsonMock.mock.calls[0][0] as { code: string; message: string };
    expect(body.code).toBe("INTERNAL_ERROR");
    // Internal cause must NOT reach the client.
    expect(body.message).not.toContain("database connection refused");
  });
});

describe("globalErrorHandler — untyped Error fallback", () => {
  it("maps any unknown Error to 500 with a safe generic message", () => {
    const err = new Error("Something completely unexpected happened");
    const { req, res, next, statusMock, jsonMock } = mockContext();

    globalErrorHandler(err, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    const body = jsonMock.mock.calls[0][0] as { code: string; message: string };
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).not.toContain("completely unexpected");
  });
});
