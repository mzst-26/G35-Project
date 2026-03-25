import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@supabase/supabase-js", () => {
  const mockMaybeSingle = vi.fn();
  const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockClient = { from: mockFrom };
  return {
    createClient: vi.fn(() => mockClient),
    __mockMaybeSingle: mockMaybeSingle,
  };
});

beforeEach(() => {
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  vi.clearAllMocks();
});

describe("checkDbHealth", () => {
  it("returns ok:true when query succeeds", async () => {
    const supabaseMod = await import("@supabase/supabase-js");
    const mockMaybeSingle = (supabaseMod as unknown as Record<string, unknown>)
      .__mockMaybeSingle as ReturnType<typeof vi.fn>;
    mockMaybeSingle.mockResolvedValue({ data: { id: "abc" }, error: null });

    const { checkDbHealth } = await import("../src/health.js");
    const result = await checkDbHealth();
    expect(result.ok).toBe(true);
  });

  it("returns ok:true when PGRST116 (no rows)", async () => {
    const supabaseMod = await import("@supabase/supabase-js");
    const mockMaybeSingle = (supabaseMod as unknown as Record<string, unknown>)
      .__mockMaybeSingle as ReturnType<typeof vi.fn>;
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });

    const { checkDbHealth } = await import("../src/health.js");
    const result = await checkDbHealth();
    expect(result.ok).toBe(true);
  });

  it("returns ok:true when probe table is missing (42P01)", async () => {
    const supabaseMod = await import("@supabase/supabase-js");
    const mockMaybeSingle = (supabaseMod as unknown as Record<string, unknown>)
      .__mockMaybeSingle as ReturnType<typeof vi.fn>;
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "42P01", message: "Table does not exist" },
    });

    const { checkDbHealth } = await import("../src/health.js");
    const result = await checkDbHealth();
    expect(result.ok).toBe(true);
  });

  it("returns ok:false on unexpected database error", async () => {
    const supabaseMod = await import("@supabase/supabase-js");
    const mockMaybeSingle = (supabaseMod as unknown as Record<string, unknown>)
      .__mockMaybeSingle as ReturnType<typeof vi.fn>;
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "Internal error" },
    });

    const { checkDbHealth } = await import("../src/health.js");
    const result = await checkDbHealth();
    expect(result.ok).toBe(false);
  });
});
