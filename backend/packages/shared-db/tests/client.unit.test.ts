import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableError } from "@infra/shared-errors";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ mocked: true })),
}));

describe("shared-db client factory", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("createAnonClient throws ServiceUnavailableError when SUPABASE_URL missing", async () => {
    delete process.env.SUPABASE_URL;
    const { createAnonClient } = await import("../src/client.js");
    expect(() => createAnonClient()).toThrow(ServiceUnavailableError);
  });

  it("createAnonClient throws ServiceUnavailableError when SUPABASE_ANON_KEY missing", async () => {
    delete process.env.SUPABASE_ANON_KEY;
    const { createAnonClient } = await import("../src/client.js");
    expect(() => createAnonClient()).toThrow(ServiceUnavailableError);
  });

  it("createServiceRoleClient throws ServiceUnavailableError when service role key missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createServiceRoleClient } = await import("../src/client.js");
    expect(() => createServiceRoleClient()).toThrow(ServiceUnavailableError);
  });
});
