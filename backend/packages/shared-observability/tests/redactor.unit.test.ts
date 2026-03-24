import { describe, it, expect } from "vitest";
import { redactPii, truncateIpAddress, PII_FIELD_NAMES } from "../src/redactor.js";

describe("redactPii", () => {
  it("replaces email with [REDACTED]", () => {
    const result = redactPii({ email: "user@example.com", id: "abc" });
    expect(result.email).toBe("[REDACTED]");
  });

  it("replaces phone with [REDACTED]", () => {
    const result = redactPii({ phone: "+14155552671", id: "abc" });
    expect(result.phone).toBe("[REDACTED]");
  });

  it("replaces name with [REDACTED]", () => {
    const result = redactPii({ name: "John Smith", id: "abc" });
    expect(result.name).toBe("[REDACTED]");
  });

  it("replaces address with [REDACTED]", () => {
    const result = redactPii({ address: "123 Main St", id: "abc" });
    expect(result.address).toBe("[REDACTED]");
  });

  it("does not modify non-PII fields", () => {
    const result = redactPii({ id: "abc", jobId: "xyz", status: "open" });
    expect(result.id).toBe("abc");
    expect(result.jobId).toBe("xyz");
    expect(result.status).toBe("open");
  });

  it("does not mutate the original object", () => {
    const original = { email: "user@example.com", id: "abc" };
    redactPii(original);
    expect(original.email).toBe("user@example.com");
  });

  it("handles all PII field names", () => {
    const input = Object.fromEntries(PII_FIELD_NAMES.map((f) => [f, "sensitive"]));
    const result = redactPii(input);
    for (const field of PII_FIELD_NAMES) {
      expect(result[field]).toBe("[REDACTED]");
    }
  });

  it("returns an empty object unchanged", () => {
    const result = redactPii({});
    expect(result).toEqual({});
  });
});

describe("truncateIpAddress", () => {
  it("truncates IPv4 last octet to x", () => {
    expect(truncateIpAddress("1.2.3.4")).toBe("1.2.3.x");
    expect(truncateIpAddress("192.168.0.1")).toBe("192.168.0.x");
  });

  it("handles IPv6 by masking the last groups", () => {
    const result = truncateIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(result).toContain("2001:0db8:85a3");
    expect(result).toContain("xxxx");
  });

  it("returns safe fallback for empty string", () => {
    expect(truncateIpAddress("")).toBe("x.x.x.x");
  });

  it("returns safe fallback for malformed IP", () => {
    expect(truncateIpAddress("not-an-ip")).toBe("x.x.x.x");
  });
});
