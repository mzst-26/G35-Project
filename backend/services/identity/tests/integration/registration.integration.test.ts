import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { AuthenticationError, ConflictError } from "../../src/errors/index.js";

const CSRF_VALUE = "test-csrf-token-registration";
const CSRF_COOKIE = `csrf-token=${CSRF_VALUE}`;

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

const mocks = vi.hoisted(() => ({
  submitRecruiterRegistration: vi.fn(),
  listRecruiterRegistrationRequests: vi.fn(),
  getRecruiterRegistrationRequest: vi.fn(),
  decideRecruiterRegistration: vi.fn(),
  verifyOtp: vi.fn(),
}));

let mockGetUserResult: {
  data: { user: { id: string; email: string; app_metadata: { role: "admin" | "recruiter" | "trade" } } | null };
  error: null | { message: string };
} = {
  data: {
    user: {
      id: "admin-user-id",
      email: "admin@example.com",
      app_metadata: { role: "admin" },
    },
  },
  error: null,
};

vi.mock("../../src/auth/companyRegistration.service.js", () => ({
  submitRecruiterRegistration: mocks.submitRecruiterRegistration,
  listRecruiterRegistrationRequests: mocks.listRecruiterRegistrationRequests,
  getRecruiterRegistrationRequest: mocks.getRecruiterRegistrationRequest,
  decideRecruiterRegistration: mocks.decideRecruiterRegistration,
  getRecruiterAccountStatus: vi.fn(),
  toIpv4Subnet: vi.fn(),
  hashUserAgent: vi.fn(),
}));

vi.mock("../../src/auth/otp.service.js", () => ({
  requestOtp: vi.fn().mockResolvedValue({ messageId: "otp-message-id" }),
  verifyOtp: mocks.verifyOtp,
}));

vi.mock("../../src/supabase/index.js", () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
      is: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: (value: unknown) => void) => resolve({ data: null, error: null }),
    };
    (c.select as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.update as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.eq as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.lt as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.is as ReturnType<typeof vi.fn>).mockReturnValue(c);
    (c.limit as ReturnType<typeof vi.fn>).mockReturnValue(c);
    return c;
  };

  return {
    createServiceRoleClient: () => ({
      auth: {
        getUser: vi.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
        signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        admin: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: "new-user-id" } }, error: null }),
          mfa: {
            listFactors: vi.fn().mockResolvedValue({ data: { factors: [] }, error: null }),
          },
        },
      },
      from: vi.fn().mockImplementation(() => makeChain()),
    }),
    createAnonClient: () => ({
      auth: {
        verifyOtp: mocks.verifyOtp,
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    }),
    createServerClient: () => ({ auth: { getUser: vi.fn() } }),
  };
});

describe("registration routes integration", () => {
  const adminToken = fakeJwt({ session_id: "admin-session", aal: "aal2" });

  beforeEach(() => {
    mockGetUserResult = {
      data: {
        user: {
          id: "admin-user-id",
          email: "admin@example.com",
          app_metadata: { role: "admin" },
        },
      },
      error: null,
    };

    mocks.submitRecruiterRegistration.mockResolvedValue({
      requestId: "11111111-1111-1111-1111-111111111111",
      status: "pending",
      deduplicated: false,
    });

    mocks.listRecruiterRegistrationRequests.mockResolvedValue({
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          status: "pending",
          submittedAt: "2026-03-06T00:00:00.000Z",
          updatedAt: "2026-03-06T00:00:00.000Z",
          reviewedAt: null,
          reviewedByAdminUserId: null,
          reviewReason: null,
          requesterFullName: "Jamie Carter",
          requesterEmail: "recruiter@example.com",
          requesterPhone: "+447700900123",
          requesterRoleTitle: "Director",
          isUkRegistered: false,
          companyName: "Northline Build Ltd",
          companyOriginCountry: "Ireland",
          ukCompanyNumber: null,
          officeAddressLine1: "10 Fleet Street",
          officeAddressLine2: null,
          officeCity: "London",
          officePostcode: "EC4Y 1AA",
          companyWebsite: null,
          requestedSeatCount: 10,
          hasInternalApprover: false,
          internalApproverFullName: null,
          internalApproverEmail: null,
          contractSignerSameAsRequester: true,
          contractSignerFullName: null,
          contractSignerEmail: null,
          policiesAcceptedAt: "2026-03-06T00:00:00.000Z",
          approvedUserId: null,
          approvedCompanyId: null,
        },
      ],
      total: 1,
    });

    mocks.getRecruiterRegistrationRequest.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      status: "pending",
      submittedAt: "2026-03-06T00:00:00.000Z",
      updatedAt: "2026-03-06T00:00:00.000Z",
      reviewedAt: null,
      reviewedByAdminUserId: null,
      reviewReason: null,
      requesterFullName: "Jamie Carter",
      requesterEmail: "recruiter@example.com",
      requesterPhone: "+447700900123",
      requesterRoleTitle: "Director",
      isUkRegistered: false,
      companyName: "Northline Build Ltd",
      companyOriginCountry: "Ireland",
      ukCompanyNumber: null,
      officeAddressLine1: "10 Fleet Street",
      officeAddressLine2: null,
      officeCity: "London",
      officePostcode: "EC4Y 1AA",
      companyWebsite: null,
      requestedSeatCount: 10,
      hasInternalApprover: false,
      internalApproverFullName: null,
      internalApproverEmail: null,
      contractSignerSameAsRequester: true,
      contractSignerFullName: null,
      contractSignerEmail: null,
      policiesAcceptedAt: "2026-03-06T00:00:00.000Z",
      approvedUserId: null,
      approvedCompanyId: null,
    });

    mocks.decideRecruiterRegistration.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      status: "approved",
      submittedAt: "2026-03-06T00:00:00.000Z",
      updatedAt: "2026-03-06T00:00:00.000Z",
      reviewedAt: "2026-03-07T00:00:00.000Z",
      reviewedByAdminUserId: "admin-user-id",
      reviewReason: "Approved",
      requesterFullName: "Jamie Carter",
      requesterEmail: "recruiter@example.com",
      requesterPhone: "+447700900123",
      requesterRoleTitle: "Director",
      isUkRegistered: false,
      companyName: "Northline Build Ltd",
      companyOriginCountry: "Ireland",
      ukCompanyNumber: null,
      officeAddressLine1: "10 Fleet Street",
      officeAddressLine2: null,
      officeCity: "London",
      officePostcode: "EC4Y 1AA",
      companyWebsite: null,
      requestedSeatCount: 10,
      hasInternalApprover: false,
      internalApproverFullName: null,
      internalApproverEmail: null,
      contractSignerSameAsRequester: true,
      contractSignerFullName: null,
      contractSignerEmail: null,
      policiesAcceptedAt: "2026-03-07T00:00:00.000Z",
      approvedUserId: "recruiter-user-id",
      approvedCompanyId: "company-id",
    });

    mocks.verifyOtp.mockResolvedValue({
      user: {
        id: "recruiter-user-id",
        email: "recruiter@example.com",
        role: "recruiter",
        stepUpVerified: false,
        expiresAt: Math.floor(Date.now() / 1000) + 900,
      },
      session: {
        sessionId: "session-id",
        userId: "recruiter-user-id",
        role: "recruiter",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        lastActiveAt: new Date().toISOString(),
        stepUpVerified: false,
        ipAddress: null,
        userAgentHash: null,
      },
      accessToken: fakeJwt({ session_id: "recruiter-session", aal: "aal1" }),
      refreshToken: "refresh-token",
    });
  });

  it("submits recruiter registration request", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/recruiter-registration")
      .send({
        requesterFullName: "Jamie Carter",
        requesterEmail: "recruiter@example.com",
        requesterPhone: "+447700900123",
        requesterRoleTitle: "Director",
        isUkRegistered: false,
        companyName: "Northline Build Ltd",
        companyOriginCountry: "Ireland",
        ukCompanyNumber: "",
        officeAddressLine1: "10 Fleet Street",
        officeAddressLine2: "",
        officeCity: "London",
        officePostcode: "EC4Y 1AA",
        companyWebsite: "northlinebuild.co.uk",
        requestedSeatCount: 15,
        hasInternalApprover: false,
        contractSignerSameAsRequester: true,
        policiesAcceptedAt: "2026-03-14T18:30:00.000Z",
      });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("pending");
  });

  it("blocks new recruiter registration when existing status is pending/approved/rejected", async () => {
    const app = createApp();
    mocks.submitRecruiterRegistration.mockRejectedValueOnce(
      new ConflictError("A registration request already exists with status 'pending'. Please contact support if you need changes."),
    );

    const response = await request(app)
      .post("/api/auth/recruiter-registration")
      .send({
        requesterFullName: "Jamie Carter",
        requesterEmail: "recruiter@example.com",
        requesterPhone: "+447700900123",
        requesterRoleTitle: "Director",
        isUkRegistered: false,
        companyName: "Northline Build Ltd",
        companyOriginCountry: "Ireland",
        ukCompanyNumber: "",
        officeAddressLine1: "10 Fleet Street",
        officeAddressLine2: "",
        officeCity: "London",
        officePostcode: "EC4Y 1AA",
        companyWebsite: "northlinebuild.co.uk",
        requestedSeatCount: 15,
        hasInternalApprover: false,
        contractSignerSameAsRequester: true,
        policiesAcceptedAt: "2026-03-14T18:30:00.000Z",
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("lists and fetches detail as admin", async () => {
    const app = createApp();

    const list = await request(app)
      .get("/api/auth/admin/registration-requests")
      .set("Cookie", `sb-access-token=${adminToken}`);

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);

    const detail = await request(app)
      .get("/api/auth/admin/registration-requests/11111111-1111-1111-1111-111111111111")
      .set("Cookie", `sb-access-token=${adminToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("approves and rejects through decision endpoint", async () => {
    const app = createApp();

    const approve = await request(app)
      .post("/api/auth/admin/registration-requests/11111111-1111-1111-1111-111111111111/decision")
      .set("Cookie", `sb-access-token=${adminToken}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ decision: "approve", reason: "Approved" });

    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe("approved");

    mocks.decideRecruiterRegistration.mockResolvedValueOnce({
      ...approve.body,
      status: "rejected",
      reviewReason: "Insufficient docs",
    });

    const reject = await request(app)
      .post("/api/auth/admin/registration-requests/11111111-1111-1111-1111-111111111111/decision")
      .set("Cookie", `sb-access-token=${adminToken}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ decision: "reject", reason: "Insufficient docs" });

    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe("rejected");
  });

  it("blocks double decision conflicts", async () => {
    const app = createApp();
    mocks.decideRecruiterRegistration.mockRejectedValueOnce(
      new ConflictError("already reviewed"),
    );

    const response = await request(app)
      .post("/api/auth/admin/registration-requests/11111111-1111-1111-1111-111111111111/decision")
      .set("Cookie", `sb-access-token=${adminToken}; ${CSRF_COOKIE}`)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ decision: "approve", reason: "Approved" });

    expect(response.status).toBe(409);
  });

  it("returns 401 for unauthorized admin mutation", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/admin/registration-requests/11111111-1111-1111-1111-111111111111/decision")
      .set("Cookie", CSRF_COOKIE)
      .set("x-csrf-token", CSRF_VALUE)
      .send({ decision: "approve", reason: "Approved" });

    expect(response.status).toBe(401);
  });

  it("returns recruiter login blocked codes for pending/rejected/suspended and allows approved", async () => {
    const app = createApp();

    mocks.verifyOtp.mockRejectedValueOnce(
      new AuthenticationError("pending", "ACCOUNT_PENDING_REVIEW"),
    );
    const pending = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "recruiter@example.com", token: "123456" });
    expect(pending.status).toBe(401);
    expect(pending.body.code).toBe("ACCOUNT_PENDING_REVIEW");

    mocks.verifyOtp.mockRejectedValueOnce(
      new AuthenticationError("rejected", "ACCOUNT_REJECTED"),
    );
    const rejected = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "recruiter@example.com", token: "123456" });
    expect(rejected.status).toBe(401);
    expect(rejected.body.code).toBe("ACCOUNT_REJECTED");

    mocks.verifyOtp.mockRejectedValueOnce(
      new AuthenticationError("suspended", "ACCOUNT_SUSPENDED"),
    );
    const suspended = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "recruiter@example.com", token: "123456" });
    expect(suspended.status).toBe(401);
    expect(suspended.body.code).toBe("ACCOUNT_SUSPENDED");

    mocks.verifyOtp.mockResolvedValueOnce({
      user: {
        id: "recruiter-user-id",
        email: "recruiter@example.com",
        role: "recruiter",
        stepUpVerified: false,
        expiresAt: Math.floor(Date.now() / 1000) + 900,
      },
      session: {
        sessionId: "session-id",
        userId: "recruiter-user-id",
        role: "recruiter",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        lastActiveAt: new Date().toISOString(),
        stepUpVerified: false,
        ipAddress: null,
        userAgentHash: null,
      },
      accessToken: fakeJwt({ session_id: "recruiter-session", aal: "aal1" }),
      refreshToken: "refresh-token",
    });

    const approved = await request(app)
      .post("/api/auth/otp/verify")
      .send({ email: "recruiter@example.com", token: "123456" });
    expect(approved.status).toBe(200);
  });

  it("rate-limits repeated public submissions", async () => {
    const app = createApp();
    const payload = {
      requesterFullName: "Jamie Carter",
      requesterEmail: "recruiter@example.com",
      requesterPhone: "+447700900123",
      requesterRoleTitle: "Director",
      isUkRegistered: false,
      companyName: "Northline Build Ltd",
      companyOriginCountry: "Ireland",
      ukCompanyNumber: "",
      officeAddressLine1: "10 Fleet Street",
      officeAddressLine2: "",
      officeCity: "London",
      officePostcode: "EC4Y 1AA",
      companyWebsite: "northlinebuild.co.uk",
      requestedSeatCount: 15,
      hasInternalApprover: false,
      contractSignerSameAsRequester: true,
    };

    await request(app).post("/api/auth/recruiter-registration").send(payload);
    await request(app).post("/api/auth/recruiter-registration").send(payload);
    await request(app).post("/api/auth/recruiter-registration").send(payload);
    const fourth = await request(app).post("/api/auth/recruiter-registration").send(payload);

    expect(fourth.status).toBe(429);
    expect(fourth.body.code).toBe("RATE_LIMITED");
  });
});
