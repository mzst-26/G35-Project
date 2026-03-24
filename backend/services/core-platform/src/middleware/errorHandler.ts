import type { NextFunction, Request, Response } from "express";
import { BaseApiError } from "@infra/shared-errors";
import { captureSentryException } from "@infra/shared-observability";
import { ZodError } from "zod";
import { logger } from "../observability/logger.js";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof BaseApiError) {
    logger.warn({ err, requestId: req.requestId, statusCode: err.statusCode }, "typed_api_error");
    res.status(err.statusCode).json({ error: err.toJSON() });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ err, requestId: req.requestId }, "zod_validation_error");
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        issues: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, "unhandled_error");
  void captureSentryException(err, {
    tags: { service: "core-platform" },
    extra: { requestId: req.requestId, path: req.path, method: req.method },
  });
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
