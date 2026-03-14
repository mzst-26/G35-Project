// Pure RBAC guard functions — no side effects, no framework coupling.
// Deny-by-default: every function returns a denial unless a matching grant is found.

import type { AuthenticatedUser, Permission } from "../types/index.js";
import { STEP_UP_ACTIONS, type StepUpAction } from "../types/role.types.js";
import { hasPermission } from "./policy.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type GuardResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Step-up MFA action set
// ---------------------------------------------------------------------------

// Actions requiring step-up MFA regardless of role.
const STEP_UP_ACTION_SET = new Set<StepUpAction>(STEP_UP_ACTIONS);

// ---------------------------------------------------------------------------
// Core guard functions
// ---------------------------------------------------------------------------

// Checks whether the user may perform an action.
// Evaluation: role must grant the permission, and step-up MFA must be satisfied
// if the action is in STEP_UP_ACTIONS.
export function canPerform(
  user: AuthenticatedUser,
  permission: Permission,
): GuardResult {
  if (!hasPermission(user.role, permission)) {
    return {
      allowed: false,
      reason: `Role '${user.role}' does not have permission '${permission}'.`,
    };
  }

  // Check if this action requires step-up MFA
  if (STEP_UP_ACTION_SET.has(permission as StepUpAction) && !user.stepUpVerified) {
    return {
      allowed: false,
      reason: `Action '${permission}' requires step-up MFA verification.`,
    };
  }

  return { allowed: true };
}

// Coarse role check for cases not mapped to a single permission atom
// (e.g. admin-only dashboards). Prefer canPerform with a specific permission where possible.
export function requireRole(
  user: AuthenticatedUser,
  ...allowedRoles: AuthenticatedUser["role"][]
): GuardResult {
  if (!allowedRoles.includes(user.role)) {
    return {
      allowed: false,
      reason: `Access denied. Required roles: [${allowedRoles.join(", ")}]. User has role: '${user.role}'.`,
    };
  }
  return { allowed: true };
}

// Type guard: returns true if the action requires step-up MFA.
// Called by the stepUpMfa middleware — do not duplicate this in individual route handlers.
export function requiresStepUpMfa(action: string): action is StepUpAction {
  return STEP_UP_ACTION_SET.has(action as StepUpAction);
}

// Returns true if the JWT expiry timestamp embedded in the token has passed.
export function isSessionExpired(user: AuthenticatedUser): boolean {
  return Math.floor(Date.now() / 1000) >= user.expiresAt;
}
