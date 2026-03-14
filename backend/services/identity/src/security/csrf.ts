// CSRF protection — double-submit cookie pattern.
//
// Why double-submit and not synchronizer token?
//   Stateless: no server-side session store required.
//   Works with httpOnly access token: attacker cannot read the CSRF cookie
//   value from JS, so they cannot forge the matching header.
//
// Flow:
//   1. After login, server sets `csrf-token` cookie (NOT httpOnly — JS must read it).
//   2. Client reads it and sends the value in the `x-csrf-token` request header.
//   3. This middleware compares header vs cookie using constant-time comparison.
//
// When COOKIE_SECRET is set (production) the token is HMAC-signed so it's
// bound to the server, preventing an attacker from crafting a valid pair
// with tokens they generate themselves (fixation resistance).

import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { emitSecurityEvent } from "../observability/events.js";

export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

// Only mutating methods need CSRF protection.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const cookieSecret = process.env.COOKIE_SECRET;

// Generates a cryptographically secure CSRF token.
// When COOKIE_SECRET is present: HMAC-SHA256(random, secret) in hex — session-bound.
// Without it (dev/test): 32 random bytes in hex.
export function generateCsrfToken(): string {
  const random = crypto.randomBytes(32).toString("hex");
  if (cookieSecret) {
    const hmac = crypto
      .createHmac("sha256", cookieSecret)
      .update(random)
      .digest("hex");
    // Format: "<random>.<hmac>" — both parts sent to the client as one opaque token.
    return `${random}.${hmac}`;
  }
  return random;
}

// Constant-time comparison of two CSRF token strings.
export function validateCsrfToken(headerValue: string, cookieValue: string): boolean {
  if (!headerValue || !cookieValue) return false;

  // In HMAC mode, verify the cookie's signature before comparing to header.
  // This prevents an attacker who can set cookies from forging a valid pair.
  if (cookieSecret && cookieValue.includes(".")) {
    const [random, expectedHmac] = cookieValue.split(".", 2);
    if (!random || !expectedHmac) return false;

    const actualHmac = crypto
      .createHmac("sha256", cookieSecret)
      .update(random)
      .digest("hex");

    const hmacBuf = Buffer.from(expectedHmac);
    const actualBuf = Buffer.from(actualHmac);
    if (hmacBuf.length !== actualBuf.length) return false;
    if (!crypto.timingSafeEqual(hmacBuf, actualBuf)) return false;
  }

  // After HMAC check (or in dev mode), compare header vs cookie byte-for-byte.
  const a = Buffer.from(headerValue);
  const b = Buffer.from(cookieValue);

  if (a.length !== b.length) {
    const len = Math.max(a.length, b.length);
    const paddedA = Buffer.alloc(len, 0);
    const paddedB = Buffer.alloc(len, 0);
    a.copy(paddedA);
    b.copy(paddedB);
    return crypto.timingSafeEqual(paddedA, paddedB);
  }

  return crypto.timingSafeEqual(a, b);
}

// Express middleware enforcing CSRF on mutating requests.
// Apply AFTER cookie-parser and BEFORE route handlers.
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;

  if (!headerToken || !cookieToken || !validateCsrfToken(headerToken, cookieToken)) {
    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: req.requestId,
      occurredAt: new Date().toISOString(),
      event: "auth.security.csrf_violation",
      detail: `Method: ${req.method}, path: ${req.path}`,
      ipAddress: req.ip,
    });
    res.status(403).json({ code: "CSRF_VIOLATION", message: "CSRF token missing or invalid." });
    return;
  }

  next();
}

