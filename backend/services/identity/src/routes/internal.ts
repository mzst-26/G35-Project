// Internal token validation endpoint for server-to-server communication.
//
// Other microservices can verify a user's token without touching Supabase directly.
// All requests must carry the shared x-internal-secret header.
//
// This router is intentionally not CSRF-protected (server-to-server, no browser cookies).
// Mount under /api/internal (see app.ts) — never expose this path to the public internet.

import { Router } from "express";
import { z } from "zod";
import { validateToken } from "../auth/session.service.js";
import { env } from "../config/env.js";
import { authLogger } from "../observability/logger.js";
import { createRateLimiter } from "../security/rateLimit.js";

export const internalRouter = Router();

// Reasonably generous limit — microservices should cache tokens between their own requests.
const limiter = createRateLimiter("general");
internalRouter.use(limiter);

const TokenVerifySchema = z.object({
  token: z.string().min(1, "token is required"),
});

// Middleware: verify the shared internal secret.
function requireInternalSecret(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  if (!env.INTERNAL_SECRET) {
    // If no INTERNAL_SECRET is configured the endpoint is disabled.
    res.status(404).json({ code: "NOT_FOUND", message: "Not found." });
    return;
  }

  const provided = req.headers["x-internal-secret"];
  if (provided !== env.INTERNAL_SECRET) {
    authLogger.warn("Internal endpoint: invalid secret", { ip: req.ip });
    res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid internal secret." });
    return;
  }
  next();
}

// POST /api/internal/token/verify
// Body: { token: string }
// Returns: { valid: true, user: AuthenticatedUser } | { valid: false, error: string }
internalRouter.post(
  "/token/verify",
  requireInternalSecret,
  async (req, res, next) => {
    try {
      const parsed = TokenVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "token field is required." });
        return;
      }

      const result = await validateToken(parsed.data.token);

      if (!result.valid) {
        res.status(200).json({ valid: false, error: result.error });
        return;
      }

      res.status(200).json({ valid: true, user: result.user });
    } catch (err) {
      next(err);
    }
  },
);
