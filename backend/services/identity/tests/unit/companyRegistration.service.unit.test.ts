import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureFailure: vi.fn(),
  breadcrumb: vi.fn(),
  authCreateUser: vi.fn(),
}));

type ChainResult = { data: unknown; error: unknown };
let fromCallIndex = 0;
let fromCallResults: ChainResult[] = [];

vi.mock("../../src/observability/sentry.js", () => ({
  captureSentryBusinessFailure: mocks.captureFailure,
  addSentryBreadcrumb: mocks.breadcrumb,
}));

vi.mock("../../src/observability/events.js", () => ({
  emitSecurityEvent: vi.fn(),
}));

vi.mock("../../src/observability/logger.js", () => ({
  authLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/supabase/index.js", () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        createUser: mocks.authCreateUser,
      },
    },
    from: () => {
      const idx = fromCallIndex++;
      const result: ChainResult = fromCallResults[idx] ?? { data: null, error: null };
      const chain: Record<string, unknown> = {
        data: result.data ?? null,
        error: result.error ?? null,
      };
      for (const key of ["select", "insert", "update", "eq", "in", "order", "limit", "is", "range"]) {
        chain[key] = vi.fn().mockReturnValue(chain);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue(result);
      chain.single = vi.fn().mockResolvedValue(result);
      return chain;
    },
  }),
}));

import {
  toIpv4Subnet,
  hashUserAgent,
  submitRecruiterRegistration,
  getRecruiterAccountStatus,
  decideRecruiterRegistration,
} from "../../src/auth/companyRegistration.service.js";

const PENDING_REGISTRATION_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  status: "pending",
  submitted_at: "2025-06-01T00:00:00.000Z",
  updated_at: "2025-06-01T00:00:00.000Z",
  reviewed_at: null,
  reviewed_by_admin_user_id: null,
  review_reason: null,
  requester_full_name: "Jamie Carter",
  requester_email: "jamie@example.com",
  requester_phone: "+44 20 5555 0123",
  requester_role_title: "Director",
  is_uk_registered: true,
  company_name: "Northline Build Ltd",
  company_origin_country: null,
  uk_company_number: "12345678",
  office_address_line1: "10 Fleet Street",
  office_address_line2: null,
  office_city: "London",
  office_postcode: "EC4Y 1AA",
  company_website: null,
  requested_seat_count: 10,
  has_internal_approver: false,
  internal_approver_full_name: null,
  internal_approver_email: null,
  contract_signer_same_as_requester: true,
  contract_signer_full_name: null,
  contract_signer_email: null,
  policies_accepted_at: "2025-06-01T00:00:00.000Z",
  approved_user_id: null,
  approved_company_id: null,
};

const VALID_SUBMIT_INPUT = {
  requesterFullName: "Jamie Carter",
  requesterEmail: "jamie@example.com",
  requesterPhone: "+44 20 5555 0123",
  requesterRoleTitle: "Director",
  isUkRegistered: true,
  companyName: "Northline Build Ltd",
  officeAddressLine1: "10 Fleet Street",
  officeCity: "London",
  officePostcode: "EC4Y 1AA",
  requestedSeatCount: 10,
  hasInternalApprover: false,
  contractSignerSameAsRequester: true,
  policiesAcceptedAt: "2025-06-01T00:00:00.000Z",
};

const SUBMIT_CONTEXT = {
  requestId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  ipAddress: "203.0.113.42",
  userAgent: "Mozilla/5.0 Test",
};

const ADMIN_UUID = "22222222-2222-2222-2222-222222222222";
const NEW_USER_UUID = "33333333-3333-3333-3333-333333333333";
const NEW_COMPANY_UUID = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  fromCallIndex = 0;
  fromCallResults = [];
  vi.clearAllMocks();
});

describe("companyRegistration service helpers", () => {
  it("normalizes IPv4 into /24 subnet", () => {
    expect(toIpv4Subnet("203.0.113.42")).toBe("203.0.113.0/24");
  });

  it("returns null for invalid IP values", () => {
    expect(toIpv4Subnet("invalid-ip")).toBeNull();
  });

  it("hashes user-agent safely", () => {
    const hash = hashUserAgent("Mozilla/5.0 Test");
    expect(hash).toHaveLength(24);
  });
});

describe("submitRecruiterRegistration", () => {
  it("creates a new registration and returns requestId and status", async () => {
    fromCallResults = [
      { data: null, error: null },
      { data: { id: "55555555-5555-5555-5555-555555555555", status: "pending" }, error: null },
    ];

    const result = await submitRecruiterRegistration(VALID_SUBMIT_INPUT, SUBMIT_CONTEXT);
    expect(result).toEqual({
      requestId: "55555555-5555-5555-5555-555555555555",
      status: "pending",
      deduplicated: false,
    });
  });

  it("throws ConflictError when a pending request already exists", async () => {
    fromCallResults = [
      { data: { id: "66666666-6666-6666-6666-666666666666", status: "pending" }, error: null },
    ];

    await expect(
      submitRecruiterRegistration(VALID_SUBMIT_INPUT, SUBMIT_CONTEXT),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(mocks.breadcrumb).toHaveBeenCalled();
  });
});

describe("getRecruiterAccountStatus", () => {
  it("returns accountStatus when the user has a company registration", async () => {
    fromCallResults = [
      {
        data: {
          id: NEW_COMPANY_UUID,
          user_id: NEW_USER_UUID,
          account_status: "approved",
          status_reason: null,
          status_changed_at: null,
        },
        error: null,
      },
    ];

    const result = await getRecruiterAccountStatus(NEW_USER_UUID);
    expect(result).toEqual({
      companyId: NEW_COMPANY_UUID,
      accountStatus: "approved",
      statusReason: null,
    });
  });

  it("returns null when the user has no company registration", async () => {
    fromCallResults = [
      { data: null, error: null },
    ];

    const result = await getRecruiterAccountStatus(NEW_USER_UUID);
    expect(result).toBeNull();
  });
});

describe("decideRecruiterRegistration", () => {
  it("blocks double decision when request is already reviewed", async () => {
    fromCallResults = [
      {
        data: {
          ...PENDING_REGISTRATION_ROW,
          status: "approved",
          reviewed_at: "2025-06-02T00:00:00.000Z",
          reviewed_by_admin_user_id: ADMIN_UUID,
          review_reason: "already reviewed",
        },
        error: null,
      },
    ];

    await expect(
      decideRecruiterRegistration({
        requestId: "11111111-1111-1111-1111-111111111111",
        decision: "approve",
        reason: "Verified.",
        adminUserId: ADMIN_UUID,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(mocks.captureFailure).toHaveBeenCalled();
  });

  it("approves a pending request and provisions user and company", async () => {
    const approvedRow = {
      ...PENDING_REGISTRATION_ROW,
      status: "approved",
      reviewed_at: "2025-06-02T00:00:00.000Z",
      reviewed_by_admin_user_id: ADMIN_UUID,
      review_reason: "Looks good",
      approved_user_id: NEW_USER_UUID,
      approved_company_id: NEW_COMPANY_UUID,
    };

    fromCallResults = [
      // 1. getRecruiterRegistrationRequest → pending row
      { data: PENDING_REGISTRATION_ROW, error: null },
      // 2. ensureRecruiterUser → no existing user
      { data: null, error: null },
      // 3. ensureRecruiterUser → insert public users row
      { data: null, error: null },
      // 4. ensureCompanyForUser → no existing company
      { data: null, error: null },
      // 5. ensureCompanyForUser → insert company
      { data: { id: NEW_COMPANY_UUID }, error: null },
      // 6. update registration request
      { data: approvedRow, error: null },
    ];

    mocks.authCreateUser.mockResolvedValue({
      data: { user: { id: NEW_USER_UUID } },
      error: null,
    });

    const result = await decideRecruiterRegistration({
      requestId: "11111111-1111-1111-1111-111111111111",
      decision: "approve",
      reason: "Looks good",
      adminUserId: ADMIN_UUID,
    });

    expect(result.status).toBe("approved");
    expect(result.approvedUserId).toBe(NEW_USER_UUID);
    expect(result.approvedCompanyId).toBe(NEW_COMPANY_UUID);
    expect(mocks.authCreateUser).toHaveBeenCalled();
  });

  it("rejects a pending request without provisioning a user or company", async () => {
    const rejectedRow = {
      ...PENDING_REGISTRATION_ROW,
      status: "rejected",
      reviewed_at: "2025-06-02T00:00:00.000Z",
      reviewed_by_admin_user_id: ADMIN_UUID,
      review_reason: "Does not meet criteria",
    };

    fromCallResults = [
      // 1. getRecruiterRegistrationRequest → pending row
      { data: PENDING_REGISTRATION_ROW, error: null },
      // 2. update registration request
      { data: rejectedRow, error: null },
    ];

    const result = await decideRecruiterRegistration({
      requestId: "11111111-1111-1111-1111-111111111111",
      decision: "reject",
      reason: "Does not meet criteria",
      adminUserId: ADMIN_UUID,
    });

    expect(result.status).toBe("rejected");
    expect(result.approvedUserId).toBeNull();
    expect(result.approvedCompanyId).toBeNull();
    expect(mocks.authCreateUser).not.toHaveBeenCalled();
  });
});
