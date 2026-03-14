// Unit tests for the OTP auth service.
//
// Supabase is mocked at the factory level — each test controls mock results
// via the let variables declared below the mock factory.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestOtp, verifyOtp } from "../../src/auth/otp.service.js";

// Minimal Supabase query-builder chain — same pattern used across all unit tests.
const makeChain = (overrides: Record<string, unknown> = {}) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  ...overrides,
});

const makeSession = (role: string) => ({
  data: {
    session: {
      access_token: "access-tok",
      refresh_token: "refresh-tok",
      expires_in: 900,
    },
    user: {
      id: "user-uuid-1",
      email: "user@example.com",
      app_metadata: { role },
    },
  },
  error: null,
});

type VerifyOtpMockResult = {
  data: {
    session: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    } | null;
    user: {
      id: string;
      email: string;
      app_metadata: { role: string };
    } | null;
  };
  error: null | { message: string };
};

let mockSignInResult: { error: null | { message: string } } = { error: null };
let mockVerifyResult: VerifyOtpMockResult = makeSession("trade");

// Admin MFA: listFactors returns { data: { factors: [...] }, error }
let mockListFactorsResult: {
  data: { factors: Array<{ factor_type: string; status: string }> } | null;
  error: null | { message: string };
} = {
  data: { factors: [{ factor_type: "totp", status: "verified" }] },
  error: null,
};

let mockRecruiterAccountStatus:
  | { companyId: string; accountStatus: "pending" | "approved" | "rejected" | "suspended"; statusReason: string | null }
  | null = null;

let mockRecruiterStatusThrows: Error | null = null;

vi.mock("../../src/supabase/index.js", () => ({
  createServiceRoleClient: () => ({
    auth: {
      signInWithOtp: vi.fn().mockImplementation(() => Promise.resolve(mockSignInResult)),
      admin: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
        mfa: {
          listFactors: vi.fn().mockImplementation(() => Promise.resolve(mockListFactorsResult)),
        },
      },
    },
    from: vi.fn().mockReturnValue(makeChain()),
  }),
  createAnonClient: () => ({
    auth: {
      verifyOtp: vi.fn().mockImplementation(() => Promise.resolve(mockVerifyResult)),
    },
  }),
  createServerClient: () => ({ auth: {} }),
}));

vi.mock("../../src/auth/companyRegistration.service.js", () => ({
  getRecruiterAccountStatus: vi.fn().mockImplementation(() => {
    if (mockRecruiterStatusThrows) return Promise.reject(mockRecruiterStatusThrows);
    return Promise.resolve(mockRecruiterAccountStatus);
  }),
}));

describe("requestOtp", () => {
  it("returns a messageId on success", async () => {
    mockSignInResult = { error: null };
    const result = await requestOtp({ email: "user@example.com" });
    expect(result).toHaveProperty("messageId");
    expect(typeof result.messageId).toBe("string");
  });

  it("still returns a messageId when Supabase errors (enumeration protection)", async () => {
    mockSignInResult = { error: { message: "Email not found" } };
    const result = await requestOtp({ email: "missing@example.com" });
    // Must NOT throw and must NOT expose whether the email exists.
    expect(result).toHaveProperty("messageId");
  });
});

describe("verifyOtp", () => {
  it("returns a session with authenticated user for a valid trade token", async () => {
    mockVerifyResult = makeSession("trade");
    const result = await verifyOtp({ email: "user@example.com", token: "123456" });
    expect(result.user.role).toBe("trade");
    expect(result.accessToken).toBe("access-tok");
    expect(result.session.userId).toBe("user-uuid-1");
  });

  it("returns authenticated user with recruiter role", async () => {
    mockVerifyResult = makeSession("recruiter");
    mockRecruiterAccountStatus = {
      companyId: "company-1",
      accountStatus: "approved",
      statusReason: null,
    };
    const result = await verifyOtp({ email: "hr@example.com", token: "654321" });
    expect(result.user.role).toBe("recruiter");
  });

  it("throws ROLE_NOT_RECOGNISED for an unknown role", async () => {
    mockVerifyResult = makeSession("unknown_role_xyz");
    await expect(verifyOtp({ email: "user@example.com", token: "123456" })).rejects.toMatchObject({
      code: "ROLE_NOT_RECOGNISED",
    });
  });

  it("throws OTP_INVALID when Supabase returns an error", async () => {
    mockVerifyResult = { data: { session: null, user: null }, error: { message: "Token has expired" } };
    await expect(verifyOtp({ email: "user@example.com", token: "000000" })).rejects.toMatchObject({
      code: "OTP_INVALID",
    });
  });

  it("throws OTP_INVALID when session is null with no error", async () => {
    mockVerifyResult = { data: { session: null, user: null }, error: null };
    await expect(verifyOtp({ email: "user@example.com", token: "111111" })).rejects.toMatchObject({
      code: "OTP_INVALID",
    });
  });
});

describe("verifyOtp — admin MFA enforcement", () => {
  it("grants a session when admin has a verified TOTP factor", async () => {
    mockVerifyResult = makeSession("admin");
    mockListFactorsResult = {
      data: { factors: [{ factor_type: "totp", status: "verified" }] },
      error: null,
    };
    const result = await verifyOtp({ email: "admin@example.com", token: "123456" });
    expect(result.user.role).toBe("admin");
    expect(result.accessToken).toBe("access-tok");
  });

  it("returns mfaSetupRequired when admin has no verified factor", async () => {
    mockVerifyResult = makeSession("admin");
    mockListFactorsResult = {
      data: { factors: [] },
      error: null,
    };
    const result = await verifyOtp({ email: "admin@example.com", token: "123456" });
    expect(result).toHaveProperty("mfaSetupRequired", true);
    expect(result).toHaveProperty("accessToken", "access-tok");
  });

  it("returns mfaSetupRequired when listFactors returns an error", async () => {
    mockVerifyResult = makeSession("admin");
    mockListFactorsResult = {
      data: null,
      error: { message: "service unavailable" },
    };
    const result = await verifyOtp({ email: "admin@example.com", token: "123456" });
    expect(result).toHaveProperty("mfaSetupRequired", true);
  });
});

describe("recruiter login gating", () => {
  beforeEach(() => {
    mockRecruiterStatusThrows = null;
    mockRecruiterAccountStatus = null;
  });

  it("throws ACCOUNT_PENDING_REVIEW for recruiter with pending status", async () => {
    mockVerifyResult = makeSession("recruiter");
    mockRecruiterAccountStatus = {
      companyId: "company-1",
      accountStatus: "pending",
      statusReason: null,
    };

    await expect(
      verifyOtp({ email: "hr@example.com", token: "123456" }),
    ).rejects.toMatchObject({ code: "ACCOUNT_PENDING_REVIEW" });
  });

  it("throws ACCOUNT_REJECTED for recruiter with rejected status", async () => {
    mockVerifyResult = makeSession("recruiter");
    mockRecruiterAccountStatus = {
      companyId: "company-1",
      accountStatus: "rejected",
      statusReason: "Did not meet requirements",
    };

    await expect(
      verifyOtp({ email: "hr@example.com", token: "123456" }),
    ).rejects.toMatchObject({ code: "ACCOUNT_REJECTED" });
  });

  it("returns session normally for recruiter with approved status", async () => {
    mockVerifyResult = makeSession("recruiter");
    mockRecruiterAccountStatus = {
      companyId: "company-1",
      accountStatus: "approved",
      statusReason: null,
    };

    const result = await verifyOtp({ email: "hr@example.com", token: "654321" });
    expect(result.user.role).toBe("recruiter");
    expect(result.accessToken).toBe("access-tok");
  });

  it("throws InternalAuthError when getRecruiterAccountStatus throws", async () => {
    mockVerifyResult = makeSession("recruiter");
    mockRecruiterStatusThrows = new Error("DB connection failed");

    await expect(
      verifyOtp({ email: "hr@example.com", token: "123456" }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});

describe("admin MFA setup flow", () => {
  it("returns mfaSetupRequired when admin has no verified TOTP factor", async () => {
    mockVerifyResult = makeSession("admin");
    mockListFactorsResult = {
      data: { factors: [] },
      error: null,
    };

    const result = await verifyOtp({ email: "admin@example.com", token: "123456" });
    expect(result).toHaveProperty("mfaSetupRequired", true);
    expect(result).toHaveProperty("accessToken", "access-tok");
    expect(result).toHaveProperty("refreshToken", "refresh-tok");
  });

  it("returns normal session when admin has verified TOTP factor", async () => {
    mockVerifyResult = makeSession("admin");
    mockListFactorsResult = {
      data: { factors: [{ factor_type: "totp", status: "verified" }] },
      error: null,
    };

    const result = await verifyOtp({ email: "admin@example.com", token: "123456" });
    expect(result.user.role).toBe("admin");
    expect(result.accessToken).toBe("access-tok");
  });
});
