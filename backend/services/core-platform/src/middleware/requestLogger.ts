import type { NextFunction, Request, Response } from "express";
import { createRequestLogger } from "@infra/shared-observability";
import { logger } from "../observability/logger.js";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();

  res.on("finish", () => {
    const reqLogger = createRequestLogger(logger, req.requestId, req.user?.userId);
    reqLogger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
      },
      "request completed",
    );
  });

  next();
}
