// RBAC authorisation middleware factory.
//
// Must be used AFTER the authenticate middleware.
//
// Usage:
//   authorise("users:delete")                  — single permission
//   authorise({ any: ["jobs:read", "jobs:write"] }) — pass if user has ANY
//   authorise({ all: ["jobs:write", "jobs:publish"] }) — pass only if user has ALL

import type { NextFunction, Request, Response } from "express";
import type { Permission } from "../types/index.js";
import { ForbiddenError, AuthenticationError } from "../errors/index.js";
import { canPerform } from "../rbac/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import crypto from "node:crypto";

type MultiPermission =
  | { any: Permission[] }
  | { all: Permission[] };

type PermissionInput = Permission | MultiPermission;

// Shared guard — ensures req.user is present and emits 401 if not.
function requireUser(req: Request, res: Response): boolean {
  if (!req.user) {
    const err = new AuthenticationError(
      "Authentication required before authorisation check.",
      "TOKEN_MISSING",
    );
    res.status(err.statusCode).json(err.toJSON());
    return false;
  }
  return true;
}

// Builds a forbidden response and emits the audit event.
function sendForbidden(
  req: Request,
  res: Response,
  reason: string,
  action: string,
): void {
  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: req.requestId,
    occurredAt: new Date().toISOString(),
    event: "auth.access.forbidden",
    userId: req.user!.id,
    role: req.user!.role,
    ipAddress: req.ip,
    resource: req.path,
    action: action as Permission,
    reason,
  });

  const err = new ForbiddenError(reason, action as Permission);
  res.status(err.statusCode).json(err.toJSON());
}

// Returns middleware that enforces the given permission(s) on the authenticated user.
export function authorise(permission: PermissionInput) {
  return function authoriseMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!requireUser(req, res)) return;

    // Single permission — existing behaviour.
    if (typeof permission === "string") {
      const result = canPerform(req.user!, permission);
      if (!result.allowed) {
        sendForbidden(req, res, result.reason, permission);
        return;
      }
      next();
      return;
    }

    // { any: [...] } — user needs at least one of the listed permissions.
    if ("any" in permission) {
      const passed = permission.any.some((p) => canPerform(req.user!, p).allowed);
      if (!passed) {
        sendForbidden(req, res, `Requires any of: ${permission.any.join(", ")}`, permission.any[0] ?? "unknown");
        return;
      }
      next();
      return;
    }

    // { all: [...] } — user needs every one of the listed permissions.
    const failedPermission = permission.all.find((p) => !canPerform(req.user!, p).allowed);
    if (failedPermission) {
      sendForbidden(req, res, `Missing required permission: ${failedPermission}`, failedPermission);
      return;
    }
    next();
  };
}
