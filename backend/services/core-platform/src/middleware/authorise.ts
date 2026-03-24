import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorisedError } from "@infra/shared-errors";
import { hasPermission, type Permission } from "@infra/shared-permissions";

export function authorise(permission: Permission) {
  return function authoriseMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      next(new UnauthorisedError("Authentication required."));
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      next(new ForbiddenError("Insufficient permissions."));
      return;
    }

    next();
  };
}
