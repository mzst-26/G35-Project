import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("outbox migration integrity", () => {
  it("contains status and retry count constraints and queue indexes", () => {
    const filePath = path.resolve(
      process.cwd(),
      "../../../SQL/migrations/core-platform/007_outbox_integrity_constraints.sql",
    );
    const sql = readFileSync(filePath, "utf8");

    expect(sql).toContain("CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter'))");
    expect(sql).toContain("CHECK (retry_count >= 0)");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_outbox_pending_next_attempt");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_event_key_unique");
  });
});
