// In-memory rate limiter with configurable window and limit
// In production, replace with Redis-backed store to share across processes
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // milliseconds
  maxRequests: number; // max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function createRateLimiter(config: RateLimitConfig) {
  return (key: string): RateLimitResult => {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      // Create new window
      const resetAt = now + config.windowMs;
      store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    // Within existing window
    if (entry.count < config.maxRequests) {
      entry.count += 1;
      return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
    }

    // Over limit
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  };
}

// Pre-configured limiters for common scenarios

// Sensitive write paths: 10 requests per minute per IP
export const sensitiveWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

// General API: 100 requests per minute per user
export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

// Login/auth: 5 attempts per minute per IP
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
});
