// Role and RBAC type contracts — single source of truth for the entire platform.
// All access decisions derive from these types, never from ad-hoc string checks.

// ---------------------------------------------------------------------------
// Canonical user roles
// ---------------------------------------------------------------------------

// admin: platform operator; recruiter: company user; trade: worker user.
export type UserRole = "admin" | "recruiter" | "trade";

// ---------------------------------------------------------------------------
// Permission atoms
// ---------------------------------------------------------------------------

// Granular permission strings for the RBAC matrix. Format: <resource>:<action>.
export type Permission =
  // Job permissions
  | "jobs:read"
  | "jobs:create"
  | "jobs:update"
  | "jobs:delete"
  // Application permissions
  | "applications:read"
  | "applications:create"
  | "applications:approve"
  | "applications:reject"
  // User management
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:ban"
  // Payments / penalties
  | "payments:read"
  | "payments:initiate"
  | "penalties:read"
  | "penalties:issue"
  // Platform administration
  | "admin:settings:read"
  | "admin:settings:update"
  | "admin:analytics:read"
  // Support
  | "support:tickets:read"
  | "support:tickets:reply"
  | "support:tickets:close"
  // Appeals
  | "appeals:read"
  | "appeals:submit"
  | "appeals:resolve";

// ---------------------------------------------------------------------------
// Step-up MFA guard list
// ---------------------------------------------------------------------------

// Actions requiring a live step-up MFA challenge regardless of role.
export type StepUpAction =
  | "payments:initiate"
  | "penalties:issue"
  | "users:create"
  | "users:ban"
  | "users:delete"
  | "admin:settings:update";

// Single runtime source used by RBAC guard/middleware to avoid drift.
export const STEP_UP_ACTIONS: readonly StepUpAction[] = [
  "payments:initiate",
  "penalties:issue",
  "users:create",
  "users:ban",
  "users:delete",
  "admin:settings:update",
] as const;

// ---------------------------------------------------------------------------
// Role permission map
// ---------------------------------------------------------------------------

// Authoritative permission matrix evaluated by rbac/policy.ts at runtime.
// Never check roles directly in route handlers — use the guard utilities.
export type RolePermissionMap = Record<UserRole, readonly Permission[]>;
