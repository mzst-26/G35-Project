import { describe, it, expect } from "vitest";
import { EMAIL_MAX_LENGTH, EMAIL_REGEX, isValidEmail } from "../src/email.js";

describe("EMAIL_MAX_LENGTH", () => {
  it("is 254 per RFC 5321", () => {
    expect(EMAIL_MAX_LENGTH).toBe(254);
  });
});

describe("EMAIL_REGEX", () => {
  it("matches a simple valid email", () => {
    expect(EMAIL_REGEX.test("user@example.com")).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(EMAIL_REGEX.test("userexample.com")).toBe(false);
  });

  it("rejects a string with no domain dot", () => {
    expect(EMAIL_REGEX.test("user@examplecom")).toBe(false);
  });

  it("rejects a string with whitespace in local part", () => {
    expect(EMAIL_REGEX.test("us er@example.com")).toBe(false);
  });
});

describe("isValidEmail", () => {
  describe("valid emails", () => {
    it("accepts a simple address", () => {
      expect(isValidEmail("simple@example.com")).toBe(true);
    });

    it("accepts a tagged address with subdomain", () => {
      expect(isValidEmail("user+tag@domain.co.uk")).toBe(true);
    });

    it("accepts a long local part within the 254-char limit", () => {
      const localPart = "a".repeat(64);
      const email = `${localPart}@example.com`;
      expect(email.length).toBeLessThanOrEqual(254);
      expect(isValidEmail(email)).toBe(true);
    });

    it("accepts a numeric-only local part", () => {
      expect(isValidEmail("12345@example.com")).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("rejects an empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });

    it("rejects a string with no @", () => {
      expect(isValidEmail("userexample.com")).toBe(false);
    });

    it("rejects a string with no domain dot", () => {
      expect(isValidEmail("user@examplecom")).toBe(false);
    });

    it("rejects a string containing whitespace", () => {
      expect(isValidEmail("us er@example.com")).toBe(false);
    });

    it("rejects double @@", () => {
      expect(isValidEmail("user@@example.com")).toBe(false);
    });

    it("rejects an email exceeding 254 characters", () => {
      const localPart = "a".repeat(243);
      const email = `${localPart}@example.com`;
      expect(email.length).toBeGreaterThan(254);
      expect(isValidEmail(email)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("rejects just-whitespace input", () => {
      expect(isValidEmail("   ")).toBe(false);
    });

    it("trims leading/trailing whitespace and validates", () => {
      expect(isValidEmail("  simple@example.com  ")).toBe(true);
    });
  });
});
