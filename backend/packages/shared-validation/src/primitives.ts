import { z } from "zod";

// UUID v4 — used for all entity IDs.
export const uuidV4Schema = z.string().uuid("Must be a valid UUID v4.");

// ISO 8601 datetime string with timezone (e.g. 2024-01-15T10:00:00.000Z).
export const isoDateSchema = z.string().datetime({ message: "Must be a valid ISO 8601 datetime." });

// Email — normalised to lowercase on parse.
export const emailSchema = z
  .string()
  .email("Must be a valid email address.")
  .transform((v) => v.toLowerCase());

// Phone — E.164 format (+14155552671). International standard.
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Must be a valid E.164 phone number (e.g. +14155552671).");

// Pagination cursor — opaque base64-encoded string.
export const cursorSchema = z
  .string()
  .optional();

// Pagination limit — coerced from string query params.
export const limitSchema = z.coerce
  .number({ invalid_type_error: "limit must be a number." })
  .int("limit must be an integer.")
  .min(1, "limit must be at least 1.")
  .max(100, "limit must not exceed 100.")
  .default(20);

// Canonical user role schema. Keep values aligned with @infra/shared-permissions/UserRole.
const USER_ROLE_VALUES = ["admin", "recruiter", "trade"] as const;
export const userRoleSchema = z.enum(USER_ROLE_VALUES);

// Canonical permission schema. Keep values aligned with @infra/shared-permissions/Permission.
const PERMISSION_VALUES = [
  "job:create",
  "job:read",
  "job:update",
  "job:transition_status",
  "job:admin_override",
  "calendar:read",
  "calendar:write",
  "company:read",
  "company:write",
  "company:admin",
  "worker:read",
  "worker:write",
  "worker:admin",
  "admin:read",
  "admin:write",
] as const;
export const permissionSchema = z.enum(PERMISSION_VALUES);
