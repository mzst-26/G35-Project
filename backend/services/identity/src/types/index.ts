/**
 * Public barrel for all identity-service type contracts.
 *
 * Import from this file — not from individual type modules — so that
 * internal refactors do not break downstream consumers.
 *
 * Example:
 *   import type { AuthenticatedUser, UserRole } from "../types/index.js";
 */

export type * from "./role.types.js";
export type * from "./auth.types.js";
export type * from "./mfa.types.js";
export type * from "./audit.types.js";
