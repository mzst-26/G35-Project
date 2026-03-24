import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { getEnv } from "../config/env.js";

let readLimiter: ReturnType<typeof rateLimit> | null = null;
let writeLimiter: ReturnType<typeof rateLimit> | null = null;
let adminLimiter: ReturnType<typeof rateLimit> | null = null;

/**
 * Creates rate limiters once at app startup (express-rate-limit forbids creating
 * instances inside the request handler chain).
 */
export function ensureRateLimitersInitialized(): void {
  if (readLimiter) return;
  const env = getEnv();
  readLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_READ,
    standardHeaders: true,
    legacyHeaders: false,
  });
  writeLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_WRITE,
    standardHeaders: true,
    legacyHeaders: false,
  });
  adminLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_ADMIN,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export function readLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  readLimiter!(req, res, next);
}

export function writeLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  writeLimiter!(req, res, next);
}

export function adminLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  adminLimiter!(req, res, next);
}
