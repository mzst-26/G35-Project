// Single source of truth for role-to-permission mappings.
// All RBAC decisions must derive from this map — no inline role string comparisons.

import type { Permission, RolePermissionMap, UserRole } from "../types/index.js";

// ---------------------------------------------------------------------------
// Permission policy matrix
// ---------------------------------------------------------------------------

export const ROLE_PERMISSION_MAP: RolePermissionMap = {
  admin: [
    // Full access across all resources
    "jobs:read",
    "jobs:create",
    "jobs:update",
    "jobs:delete",
    "applications:read",
    "applications:create",
    "applications:approve",
    "applications:reject",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "users:ban",
    "payments:read",
    "payments:initiate",
    "penalties:read",
    "penalties:issue",
    "admin:settings:read",
    "admin:settings:update",
    "admin:analytics:read",
    "support:tickets:read",
    "support:tickets:reply",
    "support:tickets:close",
    "appeals:read",
    "appeals:submit",
    "appeals:resolve",
  ],

  recruiter: [
    // Jobs — own postings only (row-level enforcement via Supabase RLS)
    "jobs:read",
    "jobs:create",
    "jobs:update",
    "jobs:delete",
    // Applications — for their own jobs
    "applications:read",
    "applications:approve",
    "applications:reject",
    // Payments — read own payment history
    "payments:read",
    // Support
    "support:tickets:read",
    "support:tickets:reply",
    // Appeals
    "appeals:read",
    "appeals:submit",
  ],

  trade: [
    // Jobs — read listings and apply
    "jobs:read",
    "applications:read",
    "applications:create",
    // Penalties — view own penalties
    "penalties:read",
    // Support
    "support:tickets:read",
    "support:tickets:reply",
    // Appeals
    "appeals:read",
    "appeals:submit",
  ],
} as const;

// ---------------------------------------------------------------------------
// Pure policy helpers (no side effects — easy to unit-test)
// ---------------------------------------------------------------------------

// Returns true if the given role grants the requested permission.
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const granted: readonly Permission[] = ROLE_PERMISSION_MAP[role];
  return granted.includes(permission);
}

// Returns every permission granted to a role — useful for admin UI summaries.
export function allPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSION_MAP[role];
}

// Returns all roles that have been granted a specific permission.
export function rolesWithPermission(permission: Permission): UserRole[] {
  const roles: UserRole[] = ["admin", "recruiter", "trade"];
  return roles.filter((role) => hasPermission(role, permission));
}
