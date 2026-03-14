import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../../src/config/env.js", () => ({
  env: {
    COMPANIES_HOUSE_API_KEY: undefined,
    COMPANIES_HOUSE_REST_API_KEY: undefined,
    CH_API_KEY: undefined,
  },
}));

import { lookupUkCompanies } from "../../src/reference/ukCompanyLookup.service.js";
import { ValidationError, InternalAuthError } from "../../src/errors/index.js";

beforeEach(() => {
  mockFetch.mockReset();
  // Clear all process.env keys used by getCompaniesHouseApiKey
  delete process.env.COMPANIES_HOUSE_API_KEY;
  delete process.env.COMPANIES_HOUSE_REST_API_KEY;
  delete process.env.CH_API_KEY;
});

describe("lookupUkCompanies", () => {
  const companiesHouseResponse = {
    items: [
      {
        company_name: "ACME Ltd",
        company_number: "12345678",
        address_snippet: "10 Downing St, London, SW1A 2AA",
      },
      {
        title: "Widget Corp",
        company_number: "87654321",
        address_snippet: "1 King Street, Manchester",
      },
    ],
  };

  it("returns mapped UkCompanyLookupResult[] on success", async () => {
    process.env.COMPANIES_HOUSE_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => companiesHouseResponse,
    });

    const result = await lookupUkCompanies("ACME");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      companyName: "ACME Ltd",
      companyNumber: "12345678",
      addressLine1: "10 Downing St",
    });
    expect(result[1]).toEqual({
      companyName: "Widget Corp",
      companyNumber: "87654321",
      addressLine1: "1 King Street",
    });
  });

  it("returns empty array for a query shorter than 2 characters", async () => {
    process.env.COMPANIES_HOUSE_API_KEY = "test-key";

    const result = await lookupUkCompanies("A");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws ValidationError when no API key is configured", async () => {
    await expect(lookupUkCompanies("ACME")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("throws InternalAuthError when the external API returns a non-ok response", async () => {
    process.env.COMPANIES_HOUSE_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(lookupUkCompanies("ACME")).rejects.toBeInstanceOf(
      InternalAuthError,
    );
  });

  it("throws when fetch itself rejects", async () => {
    process.env.COMPANIES_HOUSE_API_KEY = "test-key";

    mockFetch.mockRejectedValueOnce(new Error("DNS resolution failed"));

    await expect(lookupUkCompanies("ACME")).rejects.toThrow(
      "DNS resolution failed",
    );
  });

  it("sends Basic auth header derived from the API key", async () => {
    process.env.COMPANIES_HOUSE_API_KEY = "my-secret-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await lookupUkCompanies("test");

    const [, options] = mockFetch.mock.calls[0];
    const expectedAuth = `Basic ${Buffer.from("my-secret-key:").toString("base64")}`;
    expect(options.headers.Authorization).toBe(expectedAuth);
  });
});
