import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// The module caches results — reimport a fresh copy for each test.
let listReferenceCountries: typeof import("../../src/reference/countries.service.js").listReferenceCountries;

beforeEach(async () => {
  mockFetch.mockReset();
  // Force cache invalidation by re-importing the module each time.
  vi.resetModules();
  const mod = await import("../../src/reference/countries.service.js");
  listReferenceCountries = mod.listReferenceCountries;
});

describe("listReferenceCountries", () => {
  const validApiResponse = [
    {
      name: { common: "United Kingdom" },
      cca2: "GB",
      idd: { root: "+4", suffixes: ["4"] },
    },
    {
      name: { common: "France" },
      cca2: "FR",
      idd: { root: "+3", suffixes: ["3"] },
    },
  ];

  it("returns mapped countries on a successful fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validApiResponse,
    });

    const result = await listReferenceCountries();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(result).toHaveLength(2);
    // Sorted alphabetically by countryName
    expect(result[0]).toEqual({
      countryName: "France",
      countryCode: "FR",
      callingCode: "+33",
    });
    expect(result[1]).toEqual({
      countryName: "United Kingdom",
      countryCode: "GB",
      callingCode: "+44",
    });
  });

  it("filters out entries with missing country name or invalid code", async () => {
    const incompleteData = [
      { name: { common: "" }, cca2: "XX", idd: {} },
      { name: {}, cca2: "Y", idd: {} },
      ...validApiResponse,
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => incompleteData,
    });

    const result = await listReferenceCountries();
    expect(result).toHaveLength(2);
  });

  it("throws InternalAuthError when fetch response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(listReferenceCountries()).rejects.toThrow(
      "An unexpected authentication error occurred. Please try again.",
    );
  });

  it("throws InternalAuthError when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    await expect(listReferenceCountries()).rejects.toThrow("Network failure");
  });

  it("returns cached result on second call without re-fetching", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validApiResponse,
    });

    const first = await listReferenceCountries();
    const second = await listReferenceCountries();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(second).toEqual(first);
  });
});
