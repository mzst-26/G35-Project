// Pure RBAC guard functions — deny-by-default, no side effects.

import { UserRole } from "./roles.js";
import { Permission, ROLE_PERMISSIONS, STEP_UP_ACTIONS } from "./permissions.js";

export type GuardResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

// Returns true if the given role has been granted the requested permission.
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Returns a typed guard result for the given user and permission.
// Use this in middleware instead of hasPermission when you need the denial reason.
export function canPerform(
  user: { role: UserRole },
  permission: Permission,
): GuardResult {
  if (!hasPermission(user.role, permission)) {
    return {
      allowed: false,
      reason: `Role '${user.role}' does not have permission '${permission}'.`,
    };
  }
  return { allowed: true };
}

// Returns all permissions granted to the given role.
export function allPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

// Returns true if the permission requires a step-up MFA verified session.
export function requiresStepUpMfa(permission: Permission): boolean {
  return STEP_UP_ACTIONS.includes(permission);
}
