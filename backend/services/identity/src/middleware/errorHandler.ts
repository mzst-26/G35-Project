// Centralised Express error handler — must be the last middleware registered.
// Maps BaseAuthError subclasses to their HTTP codes; unknown errors → 500.
// Registration order: sentryErrorHandler first, then globalErrorHandler.

import type { NextFunction, Request, Response } from "express";
import { BaseAuthError } from "../errors/index.js";
import { createRequestLogger } from "../observability/logger.js";

// 4-parameter signature is required for Express to recognise this as an error handler.
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const log = createRequestLogger(req.requestId, req.user?.id);

  if (err instanceof BaseAuthError) {
    // Known, typed error — log at `warn` level and return the typed payload.
    log.warn(`auth_error: ${err.code}`, { err, statusCode: err.statusCode });
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Unknown error — log at `error` level, return generic 500.
  log.error("unhandled_error", { err });
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred. Please try again.",
  });
}
