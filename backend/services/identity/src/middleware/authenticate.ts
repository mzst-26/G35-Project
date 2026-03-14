// Authentication middleware.
//
// Reads the session access token from the httpOnly `sb-access-token` cookie,
// validates it via Supabase, and attaches the verified `AuthenticatedUser`
// to `req.user`. Everything downstream can trust `req.user` completely.
//
// Failure codes returned to clients:
//   TOKEN_MISSING       — no cookie present
//   TOKEN_EXPIRED       — valid JWT format but past expiry
//   TOKEN_INVALID       — malformed or signature mismatch
//   ROLE_NOT_RECOGNISED — JWT valid but app_metadata.role is unset/unknown

import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "../types/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { createRequestLogger } from "../observability/logger.js";
import { validateToken, touchSessionActivity, decodeJwtPayload } from "../auth/session.service.js";
import crypto from "node:crypto";

// Extend Express Request with our custom properties.
/* eslint-disable @typescript-eslint/no-namespace -- Express augmentation requires namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

// ---------------------------------------------------------------------------
// Request ID middleware — must be first in the stack
// ---------------------------------------------------------------------------

// Assigns a correlation ID to every request.
// Uses x-request-id from upstream proxies when present, otherwise generates a UUID.
export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.requestId =
    (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  next();
}

// ---------------------------------------------------------------------------
// Authenticate middleware
// ---------------------------------------------------------------------------

// Verifies the sb-access-token cookie and attaches req.user to the request.
// Auth failures are responded to directly here — never forwarded to the error handler.
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const log = createRequestLogger(req.requestId);

  const accessToken = req.cookies?.["sb-access-token"] as string | undefined;

  if (!accessToken) {
    log.debug("authenticate: no access token cookie present");
    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: req.requestId,
      occurredAt: new Date().toISOString(),
      event: "auth.session.invalid_token",
      ipAddress: req.ip,
    });
    res.status(401).json({ code: "TOKEN_MISSING", message: "Authentication required." });
    return;
  }

  const result = await validateToken(accessToken);

  if (!result.valid) {
    // Map validation errors to specific HTTP response codes.
    const codeMap = {
      token_expired:      { http: 401, code: "TOKEN_EXPIRED",  message: "Your session has expired. Please sign in again." },
      token_invalid:      { http: 401, code: "TOKEN_INVALID",  message: "Authentication token is invalid." },
      token_missing:      { http: 401, code: "TOKEN_MISSING",  message: "Authentication required." },
      role_claim_missing: { http: 401, code: "TOKEN_INVALID",  message: "Authentication token is invalid." },
      role_not_recognised:{ http: 401, code: "TOKEN_INVALID",  message: "Authentication token is invalid." },
      session_revoked:    { http: 401, code: "SESSION_REVOKED", message: "Your session has been revoked. Please sign in again." },
    } as const;

    const mapped = codeMap[result.error] ?? codeMap.token_invalid;

    log.warn("authenticate: token validation failed", { error: result.error });
    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: req.requestId,
      occurredAt: new Date().toISOString(),
      event: "auth.session.invalid_token",
      ipAddress: req.ip,
    });
    res.status(mapped.http).json({ code: mapped.code, message: mapped.message });
    return;
  }

  req.user = result.user;

  // Update lastActiveAt in auth_sessions — fire-and-forget, non-fatal.
  const jwtPayload = decodeJwtPayload(accessToken);
  const supabaseSessionId = typeof jwtPayload["session_id"] === "string"
    ? jwtPayload["session_id"]
    : null;
  if (supabaseSessionId) {
    touchSessionActivity(supabaseSessionId).catch((err) => {
      log.warn("touchSessionActivity failed", { err });
    });
  }

  emitSecurityEvent({
    eventId: crypto.randomUUID(),
    requestId: req.requestId,
    occurredAt: new Date().toISOString(),
    event: "auth.access.granted",
    userId: result.user.id,
    role: result.user.role,
    ipAddress: req.ip,
  });

  next();
}

// ---------------------------------------------------------------------------
// Optional authenticate — for endpoints accessible with or without auth
// ---------------------------------------------------------------------------

// Like authenticate but allows unauthenticated requests through.
// Route handlers must check req.user before accessing protected data.
export async function authenticateOptional(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const accessToken = req.cookies?.["sb-access-token"] as string | undefined;

  if (!accessToken) {
    next();
    return;
  }

  const result = await validateToken(accessToken);
  if (result.valid) {
    req.user = result.user;
  }

  next();
}

