import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnauthorisedError, ServiceUnavailableError } from "@infra/shared-errors";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  process.env.IDENTITY_SERVICE_URL = "http://identity:4001";
  process.env.INTERNAL_SECRET = "a".repeat(32);
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.IDENTITY_SERVICE_URL;
  delete process.env.INTERNAL_SECRET;
});

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("verifyToken — success", () => {
  it("returns an AuthenticatedUser on a valid token", async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({
        valid: true,
        user: {
          id: "user-123",
          email: "user@example.com",
          role: "recruiter",
          stepUpVerified: false,
          expiresAt: 9999999999,
        },
      }),
    );

    const { verifyToken } = await import("../src/verify-token.js");
    const user = await verifyToken("token-abc");

    expect(user.userId).toBe("user-123");
    expect(user.email).toBe("user@example.com");
    expect(user.role).toBe("recruiter");
  });

  it("maps Identity's 'id' field to AuthenticatedUser 'userId'", async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({
        valid: true,
        user: { id: "identity-id-456", email: "x@x.com", role: "trade" },
      }),
    );

    const { verifyToken } = await import("../src/verify-token.js");
    const user = await verifyToken("any-token");

    expect(user).toHaveProperty("userId", "identity-id-456");
    expect(user).not.toHaveProperty("id");
  });

  it("calls the correct Identity endpoint with the internal secret header", async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({
        valid: true,
        user: { id: "u1", email: "u@u.com", role: "admin" },
      }),
    );

    const { verifyToken } = await import("../src/verify-token.js");
    await verifyToken("my-token");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://identity:4001/api/internal/token/verify",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-internal-secret": "a".repeat(32),
        }),
      }),
    );
  });
});

describe("verifyToken — 401 from Identity", () => {
  it("throws UnauthorisedError", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ code: "TOKEN_INVALID" }, 401));

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("bad-token")).rejects.toBeInstanceOf(UnauthorisedError);
  });
});

describe("verifyToken — Identity returns valid:false", () => {
  it("throws UnauthorisedError with error from response body", async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({ valid: false, error: "token_expired" }),
    );

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("expired-token")).rejects.toBeInstanceOf(UnauthorisedError);
  });
});

describe("verifyToken — 5xx from Identity", () => {
  it("throws ServiceUnavailableError on 500", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ message: "Internal Server Error" }, 500));

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("any-token")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it("throws ServiceUnavailableError on 503", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({}, 503));

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("any-token")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});

describe("verifyToken — malformed user payload", () => {
  it("throws ServiceUnavailableError when user payload shape is invalid", async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({
        valid: true,
        user: { id: "u1", email: "not-an-email", role: "admin" },
      }),
    );

    const { verifyToken } = await import("../src/verify-token.js");
    await expect(verifyToken("any-token")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});

describe("verifyToken — network failure", () => {
  it("throws ServiceUnavailableError when fetch throws", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("any-token")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});

describe("verifyToken — missing config", () => {
  it("throws ServiceUnavailableError when IDENTITY_SERVICE_URL is not set", async () => {
    delete process.env.IDENTITY_SERVICE_URL;

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("any-token")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it("throws ServiceUnavailableError when INTERNAL_SECRET is not set", async () => {
    delete process.env.INTERNAL_SECRET;

    const { verifyToken } = await import("../src/verify-token.js");

    await expect(verifyToken("any-token")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
