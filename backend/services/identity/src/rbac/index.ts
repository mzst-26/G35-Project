/**
 * RBAC barrel.
 * Import all access-control utilities from here — not from individual files.
 */

export { ROLE_PERMISSION_MAP, hasPermission, allPermissionsForRole, rolesWithPermission } from "./policy.js";
export { canPerform, requireRole, requiresStepUpMfa, isSessionExpired } from "./guard.js";
export type { GuardResult } from "./guard.js";
