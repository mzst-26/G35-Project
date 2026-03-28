interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
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
      const resetAt = now + config.windowMs;
      store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: Math.max(config.maxRequests - 1, 0), resetAt };
    }

    if (entry.count < config.maxRequests) {
      entry.count += 1;
      return { allowed: true, remaining: Math.max(config.maxRequests - entry.count, 0), resetAt: entry.resetAt };
    }

    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  };
}

export function clearRateLimitStore(): void {
  store.clear();
}

export const sensitiveWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
});
