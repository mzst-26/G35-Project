// Step-up MFA middleware factory.
//
// Returns middleware that checks whether the authenticated user has completed
// a step-up MFA challenge recently. If not, returns 403 with a challengeUrl
// for the client to redirect to.
//
// Use this AFTER `authenticate` and `authorise` to protect sensitive actions.
//
//   router.post(
//     "/payments/initiate",
//     authenticate,
//     authorise("payments:initiate"),
//     requireStepUpMfa(),
//     initiatePaymentHandler,
//   );

import type { NextFunction, Request, Response } from "express";
import { createClient, type RedisClientType } from "redis";
import { MfaRequiredError } from "../errors/index.js";
import { emitSecurityEvent } from "../observability/events.js";
import { authLogger } from "../observability/logger.js";
import crypto from "node:crypto";
import { env } from "../config/env.js";

const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
const REDIS_KEY_PREFIX = "stepUp:";

// Lazy Redis client — only initialised when REDIS_URL is present.
// Shared across all requests; individual failures fall through to the in-memory Map.
let redisClient: RedisClientType | null = null;

if (env.REDIS_URL) {
  redisClient = createClient({ url: env.REDIS_URL }) as RedisClientType;
  redisClient.connect().catch((err: unknown) => {
    authLogger.error("stepUpMfa: Redis connect failed — falling back to in-memory cache", { err });
    redisClient = null;
  });
}

// In-memory fallback for single-instance deployments (or if Redis is unavailable).
const stepUpGrantCache = new Map<string, number>();

// Records that a user has just completed step-up MFA verification.
// Call this from the MFA verify route after a successful challenge.
export async function grantStepUp(userId: string): Promise<void> {
  if (redisClient?.isOpen) {
    try {
      await redisClient.set(`${REDIS_KEY_PREFIX}${userId}`, "1", { PX: GRACE_PERIOD_MS });
      return;
    } catch (err) {
      authLogger.warn("stepUpMfa: Redis SET failed — falling through to in-memory", { userId, err });
    }
  }
  stepUpGrantCache.set(userId, Date.now() + GRACE_PERIOD_MS);
}

// Checks if the grace period is still valid.
async function isStepUpGrantValid(userId: string): Promise<boolean> {
  if (redisClient?.isOpen) {
    try {
      const exists = await redisClient.exists(`${REDIS_KEY_PREFIX}${userId}`);
      return exists === 1;
    } catch (err) {
      authLogger.warn("stepUpMfa: Redis EXISTS failed — falling through to in-memory", { userId, err });
    }
  }

  const expiry = stepUpGrantCache.get(userId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    stepUpGrantCache.delete(userId);
    return false;
  }
  return true;
}

// Returns middleware that enforces step-up MFA.
//
// Priority order:
//   1. JWT has aal2 claim (user holds a live aal2 token) → pass
//   2. Grace-period cache grant still valid → pass
//   3. Neither → 403 with challenge URL
export function requireStepUpMfa(
  challengeBasePath = "/api/auth/mfa/challenge",
) {
  return async function stepUpMfaMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ code: "TOKEN_MISSING", message: "Authentication required." });
      return;
    }

    // aal2 token in hand — no cache lookup needed.
    if (req.user.stepUpVerified) {
      next();
      return;
    }

    // Grace period — user completed step-up recently but token was refreshed (aal1).
    if (await isStepUpGrantValid(req.user.id)) {
      next();
      return;
    }

    emitSecurityEvent({
      eventId: crypto.randomUUID(),
      requestId: req.requestId,
      occurredAt: new Date().toISOString(),
      event: "auth.mfa.stepup.required",
      userId: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
    });

    const err = new MfaRequiredError(challengeBasePath);
    res.status(err.statusCode).json(err.toJSON());
  };
}
