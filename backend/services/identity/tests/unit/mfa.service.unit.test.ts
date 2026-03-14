// Unit tests for the MFA service.
//
// Key behaviours:
//   - enrollMfaFactor throws ConflictError when a verified factor already exists
//   - verifyMfaChallenge returns { verified: true, accessToken } with aal2 token
//   - verifyMfaChallenge throws when Supabase rejects the code
//   - listMfaFactors maps Supabase factors to internal MfaFactor shape

import { describe, expect, it, vi } from "vitest";
import {
  enrollMfaFactor,
  verifyMfaChallenge,
  listMfaFactors,
} from "../../src/auth/mfa.service.js";

const aal2Token = "aal2-access-token";

// Controls per test
let mockListFactors = { data: { totp: [] as object[] }, error: null };
let mockEnroll = {
  data: {
    id: "factor-uuid-1",
    totp: { uri: "otpauth://...", secret: "BASE32SECRET", qr_code: "data:image/png;base64,abc" },
    friendly_name: "My Auth",
  },
  error: null as null | { message: string },
};
let mockVerify = {
  data: { access_token: aal2Token, refresh_token: "refresh-tok", expires_in: 900 },
  error: null as null | { message: string },
};

vi.mock("../../src/supabase/index.js", () => ({
  createServerClient: () => ({
    auth: {
      mfa: {
        listFactors: vi.fn().mockImplementation(() => Promise.resolve(mockListFactors)),
        enroll: vi.fn().mockImplementation(() => Promise.resolve(mockEnroll)),
        challenge: vi.fn().mockResolvedValue({
          data: { id: "challenge-uuid-1", expires_at: 1800000000 },
          error: null,
        }),
        verify: vi.fn().mockImplementation(() => Promise.resolve(mockVerify)),
        unenroll: vi.fn().mockResolvedValue({ data: { id: "factor-uuid-1" }, error: null }),
      },
    },
  }),
  createServiceRoleClient: () => ({
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  }),
  createAnonClient: () => ({ auth: {} }),
}));

describe("enrollMfaFactor", () => {
  it("returns factorId and TOTP URI when enrollment succeeds", async () => {
    mockListFactors = { data: { totp: [] }, error: null };
    const result = await enrollMfaFactor("access-tok", { type: "totp", friendlyName: "My Auth" });
    expect(result.factorId).toBe("factor-uuid-1");
    expect(result.totpUri).toMatch(/^otpauth/);
  });

  it("throws ConflictError when user already has a verified factor", async () => {
    mockListFactors = {
      data: {
        totp: [{ id: "existing-factor", status: "verified", type: "totp" }],
      },
      error: null,
    };
    await expect(
      enrollMfaFactor("access-tok", { type: "totp", friendlyName: "Duplicate" }),
    ).rejects.toMatchObject({ statusCode: 409 });

    // Reset
    mockListFactors = { data: { totp: [] }, error: null };
  });
});

describe("verifyMfaChallenge", () => {
  it("returns { verified: true, accessToken } on valid TOTP code", async () => {
    mockVerify = {
      data: { access_token: aal2Token, refresh_token: "r-tok", expires_in: 900 },
      error: null,
    };
    const result = await verifyMfaChallenge("access-tok", {
      factorId: "factor-uuid-1",
      challengeId: "challenge-uuid-1",
      code: "123456",
    });
    expect(result.verified).toBe(true);
    expect(result.accessToken).toBe(aal2Token);
  });

  it("throws AuthenticationError when Supabase rejects the code", async () => {
    mockVerify = {
      data: { access_token: "", refresh_token: "", expires_in: 0 },
      error: { message: "Invalid TOTP code" },
    };
    await expect(
      verifyMfaChallenge("access-tok", {
        factorId: "factor-uuid-1",
        challengeId: "challenge-uuid-1",
        code: "000000",
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("listMfaFactors", () => {
  it("returns an empty array when no factors exist", async () => {
    mockListFactors = { data: { totp: [] }, error: null };
    const factors = await listMfaFactors("access-tok");
    expect(factors).toEqual([]);
  });

  it("maps Supabase TOTP factor to internal MfaFactor shape", async () => {
    const now = new Date().toISOString();
    mockListFactors = {
      data: {
        totp: [
          {
            id: "factor-uuid-1",
            type: "totp",
            status: "verified",
            friendly_name: "My App",
            created_at: now,
            updated_at: now,
          },
        ],
      },
      error: null,
    };
    const factors = await listMfaFactors("access-tok");
    expect(factors).toHaveLength(1);
    // Service maps supabase `f.id` → `factorId` in the MfaFactor type.
    expect(factors[0].factorId).toBe("factor-uuid-1");
    expect(factors[0].status).toBe("verified");
    expect(factors[0].type).toBe("totp");
  });
});
