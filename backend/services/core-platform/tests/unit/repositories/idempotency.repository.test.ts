import { describe, expect, it, vi } from "vitest";
import { ConflictError, ServiceUnavailableError } from "@infra/shared-errors";
import { IdempotencyRepository, type IdempotencyContext } from "../../../src/repositories/idempotency.repository.js";

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function createFindClient(result: { data: unknown; error: unknown }) {
  const chain: MockChain = {
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gt.mockReturnValue(chain);

  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

const context: IdempotencyContext = {
  key: "00000000-0000-4000-8000-000000000111",
  actorId: "r1",
  method: "POST",
  canonicalRoute: "POST:/api/v1/jobs",
  requestHash: "hash-1",
};

describe("IdempotencyRepository", () => {
  it("returns null when no unexpired record exists", async () => {
    const client = createFindClient({ data: null, error: null });
    const repo = new IdempotencyRepository(client as never);
    await expect(repo.find(context)).resolves.toBeNull();
  });

  it("returns cached response when hash matches", async () => {
    const client = createFindClient({
      data: { status_code: 201, response_body: { data: { id: "j1" } }, request_hash: "hash-1" },
      error: null,
    });
    const repo = new IdempotencyRepository(client as never);
    await expect(repo.find(context)).resolves.toEqual({
      statusCode: 201,
      responseBody: { data: { id: "j1" } },
    });
  });

  it("throws conflict when same key is reused with different payload hash", async () => {
    const client = createFindClient({
      data: { status_code: 201, response_body: { data: { id: "j1" } }, request_hash: "hash-other" },
      error: null,
    });
    const repo = new IdempotencyRepository(client as never);
    await expect(repo.find(context)).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws service unavailable when storage query fails", async () => {
    const client = createFindClient({ data: null, error: { message: "db down" } });
    const repo = new IdempotencyRepository(client as never);
    await expect(repo.find(context)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it("throws service unavailable when save fails", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: "write fail" } }),
      }),
    };
    const repo = new IdempotencyRepository(client as never);
    await expect(repo.save(context, 200, { ok: true })).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
