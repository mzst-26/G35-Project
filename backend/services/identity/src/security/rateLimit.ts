// Rate limiting for authentication endpoints.
//
// Uses RedisStore when REDIS_URL is set (required before horizontal scaling).
// Falls back to in-memory store in single-replica / development deployments.
//
// Cloudflare WAF rules should mirror these thresholds; Express is defence-in-depth.

import { rateLimit, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";
import type { Request, Response } from "express";
import { emitSecurityEvent } from "../observability/events.js";
import { authLogger } from "../observability/logger.js";
import crypto from "node:crypto";
import { env } from "../config/env.js";

// Lazy Redis client — only initialised when REDIS_URL is configured.
// Failures fall through to the in-memory MemoryStore automatically.
let redisClient: RedisClientType | null = null;

if (env.REDIS_URL) {
  redisClient = createClient({ url: env.REDIS_URL }) as RedisClientType;
  redisClient.connect().catch((err: unknown) => {
    authLogger.error("rateLimit: Redis connect failed — falling back to in-memory store", { err });
    redisClient = null;
  });
}

// Named rate limit profiles — tune after production traffic analysis.
export const RATE_LIMIT_PROFILES = {
  // 5 requests / 10 minutes — blocks account-enumeration probes.
  otpRequest: { maxRequests: 5, windowSeconds: 600 },
  // 10 attempts / 15 minutes — prevents OTP brute-force per IP.
  otpVerify: { maxRequests: 10, windowSeconds: 900 },
  // 10 challenges / 10 minutes — MFA challenge creation.
  mfaChallenge: { maxRequests: 10, windowSeconds: 600 },
  // 5 verify attempts / 15 minutes — tighter because codes are 6-digit.
  mfaVerify: { maxRequests: 5, windowSeconds: 900 },
  // 60 refreshes / minute — generous for mobile apps that refresh often.
  sessionRefresh: { maxRequests: 60, windowSeconds: 60 },
  // General fallback for any auth endpoint not covered above.
  general: { maxRequests: 100, windowSeconds: 60 },
} as const;

export type RateLimitProfile = keyof typeof RATE_LIMIT_PROFILES;

// Creates an Express rate-limiting middleware for the given profile.
// Emits a brute_force_detected event when a client hits the ceiling.
export function createRateLimiter(profile: RateLimitProfile) {
  const { maxRequests, windowSeconds } = RATE_LIMIT_PROFILES[profile];

  const options: Partial<Options> = {
    windowMs: windowSeconds * 1000,
    limit: maxRequests,
    standardHeaders: "draft-7", // Sends RateLimit-* headers per draft-7 RFC.
    legacyHeaders: false,
    skipSuccessfulRequests: false,

    // Map exceeded requests to our typed error shape.
    handler: (req: Request, res: Response) => {
      const retryAfter = Math.ceil(windowSeconds);

      emitSecurityEvent({
        eventId: crypto.randomUUID(),
        requestId: req.requestId ?? "unknown",
        occurredAt: new Date().toISOString(),
        event: "auth.security.brute_force_detected",
        detail: `Profile: ${profile}, IP: ${req.ip ?? "unknown"}`,
        ipAddress: req.ip,
      });

      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        retryAfter,
      });
    },

    // Skip trusted health-check IPs from rate limiting.
    skip: (req: Request) => {
      return req.path === "/health";
    },
  };

  // Use Redis-backed store when available for cross-replica consistency.
  if (redisClient?.isOpen) {
    options.store = new RedisStore({
      sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
    });
  }

  return rateLimit(options);
}

