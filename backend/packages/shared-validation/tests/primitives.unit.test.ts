import { describe, it, expect } from "vitest";
import {
  uuidV4Schema,
  isoDateSchema,
  emailSchema,
  phoneSchema,
  limitSchema,
  paginationQuerySchema,
  userRoleSchema,
  permissionSchema,
} from "../src/index.js";
import { UserRole, Permission } from "@infra/shared-permissions";

describe("uuidV4Schema", () => {
  it("accepts a valid UUID v4", () => {
    expect(uuidV4Schema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(uuidV4Schema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepts a valid ISO 8601 datetime with timezone", () => {
    expect(isoDateSchema.safeParse("2024-01-15T10:00:00.000Z").success).toBe(true);
  });

  it("rejects a plain date string", () => {
    expect(isoDateSchema.safeParse("2024-01-15").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts a valid email address", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("normalises email to lowercase", () => {
    const result = emailSchema.safeParse("User@Example.COM");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("user@example.com");
  });
});

describe("phoneSchema", () => {
  it("accepts a valid E.164 number", () => {
    expect(phoneSchema.safeParse("+14155552671").success).toBe(true);
  });

  it("rejects local number without country code", () => {
    expect(phoneSchema.safeParse("07911123456").success).toBe(false);
  });
});

describe("limitSchema", () => {
  it("defaults to 20", () => {
    const result = limitSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(20);
  });
});

describe("paginationQuerySchema", () => {
  it("parses query with defaults", () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(20);
  });
});

describe("userRoleSchema", () => {
  it("accepts canonical roles", () => {
    expect(userRoleSchema.safeParse(UserRole.ADMIN).success).toBe(true);
    expect(userRoleSchema.safeParse(UserRole.RECRUITER).success).toBe(true);
    expect(userRoleSchema.safeParse(UserRole.TRADE).success).toBe(true);
  });

  it("rejects unknown role values", () => {
    expect(userRoleSchema.safeParse("super-admin").success).toBe(false);
  });
});

describe("permissionSchema", () => {
  it("accepts canonical permission values", () => {
    expect(permissionSchema.safeParse(Permission.JOB_CREATE).success).toBe(true);
  });

  it("rejects unknown permission values", () => {
    expect(permissionSchema.safeParse("foo:bar").success).toBe(false);
  });
});
import { describe, it, expect } from "vitest";
import {
  uuidV4Schema,
  isoDateSchema,
  emailSchema,
  phoneSchema,
  limitSchema,
  paginationQuerySchema,
} from "../src/index.js";

describe("uuidV4Schema", () => {
  it("accepts a valid UUID v4", () => {
    expect(uuidV4Schema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(uuidV4Schema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(uuidV4Schema.safeParse("").success).toBe(false);
  });

  it("rejects a UUID with wrong format", () => {
    expect(uuidV4Schema.safeParse("550e8400-e29b-41d4-a716").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepts a valid ISO 8601 datetime with timezone", () => {
    expect(isoDateSchema.safeParse("2024-01-15T10:00:00.000Z").success).toBe(true);
  });

  it("rejects a plain date string", () => {
    expect(isoDateSchema.safeParse("2024-01-15").success).toBe(false);
  });

  it("rejects a free-form string", () => {
    expect(isoDateSchema.safeParse("January 15, 2024").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts a valid email address", () => {
    const result = emailSchema.safeParse("user@example.com");
    expect(result.success).toBe(true);
  });

  it("normalises email to lowercase", () => {
    const result = emailSchema.safeParse("User@Example.COM");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("user@example.com");
  });

  it("rejects a string that is not an email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("@missing-local.com").success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("accepts a valid E.164 US number", () => {
    expect(phoneSchema.safeParse("+14155552671").success).toBe(true);
  });

  it("accepts a valid E.164 UK number", () => {
    expect(phoneSchema.safeParse("+447911123456").success).toBe(true);
  });

  it("rejects a local number without country code", () => {
    expect(phoneSchema.safeParse("07911123456").success).toBe(false);
  });

  it("rejects a number with only plus sign", () => {
    expect(phoneSchema.safeParse("+").success).toBe(false);
  });

  it("rejects a number starting with +0", () => {
    expect(phoneSchema.safeParse("+0123456789").success).toBe(false);
  });
});

describe("limitSchema", () => {
  it("defaults to 20 when not provided", () => {
    const result = limitSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(20);
  });

  it("coerces string '50' to number 50", () => {
    const result = limitSchema.safeParse("50");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(50);
  });

  it("rejects limit > 100", () => {
    expect(limitSchema.safeParse(101).success).toBe(false);
  });

  it("rejects limit < 1", () => {
    expect(limitSchema.safeParse(0).success).toBe(false);
  });
});

describe("paginationQuerySchema", () => {
  it("uses limit default of 20 when no input given", () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(20);
  });

  it("accepts valid limit and no cursor", () => {
    const result = paginationQuerySchema.safeParse({ limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it("rejects limit above 100", () => {
    expect(paginationQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});
