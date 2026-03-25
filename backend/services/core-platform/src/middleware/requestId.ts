import type { NextFunction, Request, Response } from "express";
import { runWithRequestContext } from "@infra/shared-observability";
import crypto from "node:crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  runWithRequestContext({ requestId }, () => next());
}
