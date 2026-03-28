// Canonical permission atoms for the platform.
// Format: resource:action
// Single source of truth — every RBAC decision derives from this map.

import { UserRole } from "./roles.js";

export enum Permission {
  // ── Jobs ─────────────────────────────────────────────────────────────────
  JOB_CREATE = "job:create",
  JOB_READ = "job:read",
  JOB_UPDATE = "job:update",
  JOB_TRANSITION_STATUS = "job:transition_status",
  JOB_ADMIN_OVERRIDE = "job:admin_override",

  // ── Calendar ──────────────────────────────────────────────────────────────
  CALENDAR_READ = "calendar:read",
  CALENDAR_WRITE = "calendar:write",

  // ── Company ───────────────────────────────────────────────────────────────
  COMPANY_READ = "company:read",
  COMPANY_WRITE = "company:write",
  COMPANY_ADMIN = "company:admin",

  // ── Worker ────────────────────────────────────────────────────────────────
  WORKER_READ = "worker:read",
  WORKER_WRITE = "worker:write",
  WORKER_ADMIN = "worker:admin",

  // ── Platform Administration ────────────────────────────────────────────────
  ADMIN_READ = "admin:read",
  ADMIN_WRITE = "admin:write",
}

// Actions that require an already-verified step-up MFA session.
// Services can enforce this centrally in middleware.
export const STEP_UP_ACTIONS: readonly Permission[] = [
  Permission.JOB_ADMIN_OVERRIDE,
  Permission.COMPANY_ADMIN,
  Permission.WORKER_ADMIN,
  Permission.ADMIN_WRITE,
];

// Authoritative permission matrix.
// All access decisions must derive from this map — never compare role strings directly.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),

  [UserRole.RECRUITER]: [
    Permission.JOB_CREATE,
    Permission.JOB_READ,
    Permission.JOB_UPDATE,
    Permission.JOB_TRANSITION_STATUS,
    Permission.CALENDAR_READ,
    Permission.COMPANY_READ,
    Permission.COMPANY_WRITE,
    Permission.WORKER_READ,
  ],

  [UserRole.TRADE]: [
    Permission.JOB_READ,
    Permission.CALENDAR_READ,
    Permission.CALENDAR_WRITE,
    Permission.WORKER_READ,
    Permission.WORKER_WRITE,
  ],
};
