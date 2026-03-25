import { describe, it, expect } from "vitest";
import { sortQuerySchema } from "../src/index.js";

describe("sortQuerySchema", () => {
  it("defaults sortDir to asc", () => {
    const result = sortQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortDir).toBe("asc");
      expect(result.data.sortBy).toBeUndefined();
    }
  });

  it("accepts valid sortBy and desc direction", () => {
    const result = sortQuerySchema.safeParse({ sortBy: "createdAt", sortDir: "desc" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sortDir value", () => {
    expect(sortQuerySchema.safeParse({ sortDir: "descending" }).success).toBe(false);
  });

  it("rejects empty sortBy", () => {
    expect(sortQuerySchema.safeParse({ sortBy: "" }).success).toBe(false);
  });

  it("rejects sortBy with disallowed characters", () => {
    expect(sortQuerySchema.safeParse({ sortBy: "createdAt;DROP TABLE" }).success).toBe(false);
  });
});
