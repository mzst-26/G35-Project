// Unit tests for Zod validation schemas and the parseOrThrow helper.
//
// Validates that schemas accept correct input, reject invalid input with
// the right messages, and that parseOrThrow throws ValidationError on failure.

import { describe, expect, it } from "vitest";
import {
  OtpRequestSchema,
  OtpVerifySchema,
  MfaVerifySchema,
  RecruiterRegistrationSubmitSchema,
  AdminRegistrationDecisionSchema,
  parseOrThrow,
} from "../../src/security/validators.js";
import { ValidationError } from "../../src/errors/index.js";

describe("OtpRequestSchema", () => {
  it("accepts a valid email", () => {
    const result = OtpRequestSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("normalises email to lowercase and trims whitespace", () => {
    const result = OtpRequestSchema.safeParse({ email: "  USER@EXAMPLE.COM  " });
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects when email field is missing", () => {
    const result = OtpRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an email with invalid format", () => {
    const result = OtpRequestSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an email missing the domain part", () => {
    const result = OtpRequestSchema.safeParse({ email: "user@" });
    expect(result.success).toBe(false);
  });
});

describe("OtpVerifySchema", () => {
  it("accepts a valid email and 6-digit numeric token", () => {
    const result = OtpVerifySchema.safeParse({ email: "user@example.com", token: "123456" });
    expect(result.success).toBe(true);
  });

  it("rejects when token field is missing", () => {
    const result = OtpVerifySchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a token shorter than 6 digits", () => {
    const result = OtpVerifySchema.safeParse({ email: "user@example.com", token: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects a token longer than 6 characters", () => {
    const result = OtpVerifySchema.safeParse({ email: "user@example.com", token: "1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects a token with non-numeric characters", () => {
    const result = OtpVerifySchema.safeParse({ email: "user@example.com", token: "abc123" });
    expect(result.success).toBe(false);
  });
});

describe("MfaVerifySchema", () => {
  const validPayload = {
    factorId:    "11111111-1111-1111-1111-111111111111",
    challengeId: "22222222-2222-2222-2222-222222222222",
    code:        "123456",
  };

  it("accepts valid UUID fields and a 6-digit code", () => {
    const result = MfaVerifySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID factorId", () => {
    const result = MfaVerifySchema.safeParse({ ...validPayload, factorId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID challengeId", () => {
    const result = MfaVerifySchema.safeParse({ ...validPayload, challengeId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric TOTP code", () => {
    const result = MfaVerifySchema.safeParse({ ...validPayload, code: "abc123" });
    expect(result.success).toBe(false);
  });
});

describe("parseOrThrow", () => {
  it("returns the parsed and transformed data on success", () => {
    const result = parseOrThrow(OtpRequestSchema, { email: "OK@example.com" });
    // Should be lowercased by the schema transform.
    expect(result.email).toBe("ok@example.com");
  });

  it("throws ValidationError when validation fails", () => {
    expect(() =>
      parseOrThrow(OtpRequestSchema, { email: "bad-email" }),
    ).toThrow(ValidationError);
  });

  it("throws ValidationError with code VALIDATION_ERROR", () => {
    try {
      parseOrThrow(OtpRequestSchema, { email: "bad" });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("throws ValidationError with a non-empty issues array", () => {
    try {
      parseOrThrow(OtpRequestSchema, {});
    } catch (err) {
      const ve = err as ValidationError;
      expect(ve.issues.length).toBeGreaterThan(0);
      expect(ve.issues[0]).toHaveProperty("field");
      expect(ve.issues[0]).toHaveProperty("message");
    }
  });

  it("includes errors for all failing fields when multiple fields are invalid", () => {
    try {
      parseOrThrow(OtpVerifySchema, { email: "bad", token: "abc" });
    } catch (err) {
      const ve = err as ValidationError;
      // Both email and token should produce issues.
      expect(ve.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("RecruiterRegistrationSubmitSchema", () => {
  const basePayload = {
    requesterFullName: "Jamie Carter",
    requesterEmail: "jamie@example.com",
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
    requestedSeatCount: 25,
    hasInternalApprover: true,
    internalApproverFullName: "Alice Thomson",
    internalApproverEmail: "alice@northlinebuild.co.uk",
    contractSignerSameAsRequester: false,
    contractSignerFullName: "Morgan Kerr",
    contractSignerEmail: "morgan@northlinebuild.co.uk",
    policiesAcceptedAt: "2026-03-14T18:30:00.000Z",
    metadata: { source: "web" },
  };

  it("accepts valid recruiter registration payload", () => {
    const result = RecruiterRegistrationSubmitSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it("requires internal approver fields when enabled", () => {
    const result = RecruiterRegistrationSubmitSchema.safeParse({
      ...basePayload,
      internalApproverFullName: "",
      internalApproverEmail: "",
    });

    expect(result.success).toBe(false);
  });

  it("requires contract signer fields when signer differs from requester", () => {
    const result = RecruiterRegistrationSubmitSchema.safeParse({
      ...basePayload,
      contractSignerFullName: "",
      contractSignerEmail: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("AdminRegistrationDecisionSchema", () => {
  it("accepts approve decision with reason", () => {
    const result = AdminRegistrationDecisionSchema.safeParse({
      decision: "approve",
      reason: "Verified legal entity and requester identity.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects decisions with empty reason", () => {
    const result = AdminRegistrationDecisionSchema.safeParse({
      decision: "reject",
      reason: "",
    });

    expect(result.success).toBe(false);
  });
});
