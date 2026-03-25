import type { NextFunction, Request, Response } from "express";
import { BadRequestError, BaseApiError } from "@infra/shared-errors";
import { captureSentryException } from "@infra/shared-observability";
import { ZodError } from "zod";
import { logger } from "../observability/logger.js";

function isMalformedJsonBody(err: Error): boolean {
  if (!(err instanceof SyntaxError)) return false;
  const typed = err as Error & { status?: number; statusCode?: number };
  const status = typed.status ?? typed.statusCode;
  return status === 400;
}

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    logger.error({ err, requestId: req.requestId }, "error_handler_after_headers_sent");
    return;
  }

  if (isMalformedJsonBody(err)) {
    logger.warn({ err, requestId: req.requestId }, "malformed_json_body");
    const typed = new BadRequestError("Request body is not valid JSON.", "INVALID_JSON", err);
    res.status(typed.statusCode).json({ error: typed.toJSON() });
    return;
  }

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
