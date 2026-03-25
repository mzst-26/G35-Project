import { describe, it, expect } from "vitest";
import {
  UserRole,
  Permission,
  STEP_UP_ACTIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  canPerform,
  allPermissionsForRole,
  requiresStepUpMfa,
} from "../src/index.js";

describe("ROLE_PERMISSIONS — admin", () => {
  it("admin has every permission in the Permission enum", () => {
    const adminPerms = ROLE_PERMISSIONS[UserRole.ADMIN];
    for (const perm of Object.values(Permission)) {
      expect(adminPerms).toContain(perm);
    }
  });

  it("admin has job:admin_override", () => {
    expect(hasPermission(UserRole.ADMIN, Permission.JOB_ADMIN_OVERRIDE)).toBe(true);
  });

  it("admin has admin:write", () => {
    expect(hasPermission(UserRole.ADMIN, Permission.ADMIN_WRITE)).toBe(true);
  });
});

describe("ROLE_PERMISSIONS — recruiter", () => {
  it("recruiter can create jobs", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.JOB_CREATE)).toBe(true);
  });

  it("recruiter can read and update jobs", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.JOB_READ)).toBe(true);
    expect(hasPermission(UserRole.RECRUITER, Permission.JOB_UPDATE)).toBe(true);
  });

  it("recruiter can transition job status", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.JOB_TRANSITION_STATUS)).toBe(true);
  });

  it("recruiter can read and write own company", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.COMPANY_READ)).toBe(true);
    expect(hasPermission(UserRole.RECRUITER, Permission.COMPANY_WRITE)).toBe(true);
  });

  it("recruiter cannot access admin overrides", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.JOB_ADMIN_OVERRIDE)).toBe(false);
    expect(hasPermission(UserRole.RECRUITER, Permission.ADMIN_WRITE)).toBe(false);
    expect(hasPermission(UserRole.RECRUITER, Permission.ADMIN_READ)).toBe(false);
  });

  it("recruiter cannot write calendar", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.CALENDAR_WRITE)).toBe(false);
  });

  it("recruiter cannot access worker admin", () => {
    expect(hasPermission(UserRole.RECRUITER, Permission.WORKER_ADMIN)).toBe(false);
    expect(hasPermission(UserRole.RECRUITER, Permission.COMPANY_ADMIN)).toBe(false);
  });
});

describe("ROLE_PERMISSIONS — trade (worker)", () => {
  it("trade can read jobs", () => {
    expect(hasPermission(UserRole.TRADE, Permission.JOB_READ)).toBe(true);
  });

  it("trade can write and read calendar", () => {
    expect(hasPermission(UserRole.TRADE, Permission.CALENDAR_WRITE)).toBe(true);
    expect(hasPermission(UserRole.TRADE, Permission.CALENDAR_READ)).toBe(true);
  });

  it("trade can read and write own worker profile", () => {
    expect(hasPermission(UserRole.TRADE, Permission.WORKER_READ)).toBe(true);
    expect(hasPermission(UserRole.TRADE, Permission.WORKER_WRITE)).toBe(true);
  });

  it("trade cannot create jobs", () => {
    expect(hasPermission(UserRole.TRADE, Permission.JOB_CREATE)).toBe(false);
  });

  it("trade cannot access admin routes", () => {
    expect(hasPermission(UserRole.TRADE, Permission.ADMIN_READ)).toBe(false);
    expect(hasPermission(UserRole.TRADE, Permission.ADMIN_WRITE)).toBe(false);
  });

  it("trade cannot write company profiles", () => {
    expect(hasPermission(UserRole.TRADE, Permission.COMPANY_WRITE)).toBe(false);
  });
});

describe("canPerform", () => {
  it("returns allowed:true when permission is granted", () => {
    const result = canPerform({ role: UserRole.RECRUITER }, Permission.JOB_CREATE);
    expect(result.allowed).toBe(true);
  });

  it("returns allowed:false with a descriptive reason when denied", () => {
    const result = canPerform({ role: UserRole.TRADE }, Permission.JOB_CREATE);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain("trade");
      expect(result.reason).toContain("job:create");
    }
  });

  it("admin is allowed everything via canPerform", () => {
    for (const perm of Object.values(Permission)) {
      const result = canPerform({ role: UserRole.ADMIN }, perm);
      expect(result.allowed).toBe(true);
    }
  });
});

describe("allPermissionsForRole", () => {
  it("returns a non-empty array for every role", () => {
    for (const role of Object.values(UserRole)) {
      expect(allPermissionsForRole(role).length).toBeGreaterThan(0);
    }
  });
});

describe("STEP_UP_ACTIONS", () => {
  it("contains only defined Permission enum values", () => {
    for (const action of STEP_UP_ACTIONS) {
      expect(Object.values(Permission)).toContain(action);
    }
  });

  it("contains admin-sensitive actions", () => {
    expect(STEP_UP_ACTIONS).toContain(Permission.JOB_ADMIN_OVERRIDE);
    expect(STEP_UP_ACTIONS).toContain(Permission.ADMIN_WRITE);
  });

  it("requiresStepUpMfa returns true for step-up actions", () => {
    expect(requiresStepUpMfa(Permission.ADMIN_WRITE)).toBe(true);
    expect(requiresStepUpMfa(Permission.JOB_ADMIN_OVERRIDE)).toBe(true);
  });

  it("requiresStepUpMfa returns false for non-step-up actions", () => {
    expect(requiresStepUpMfa(Permission.JOB_READ)).toBe(false);
    expect(requiresStepUpMfa(Permission.CALENDAR_READ)).toBe(false);
  });
});
