import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter, sensitiveWriteLimiter, generalApiLimiter, authLimiter } from '@/lib/utils/throttle';

describe('lib/utils/throttle.ts', () => {
  describe('createRateLimiter', () => {
    it('allows requests within window limit', () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 3 });

      const result1 = limiter('user-123');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = limiter('user-123');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = limiter('user-123');
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('rejects requests exceeding limit', () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });

      limiter('user-123');
      limiter('user-123');

      const result4 = limiter('user-123');
      expect(result4.allowed).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('resets after window expires', async () => {
      const limiter = createRateLimiter({ windowMs: 20, maxRequests: 1 });

      const result1 = limiter('user-reset-test');
      expect(result1.allowed).toBe(true);

      const result2 = limiter('user-reset-test');
      expect(result2.allowed).toBe(false);

      // Wait for window to reset with sufficient buffer
      await new Promise((resolve) => setTimeout(resolve, 50));

      const result3 = limiter('user-reset-test');
      expect(result3.allowed).toBe(true);
    });

    it('tracks separate limits per key', () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });

      const user1Result = limiter('user-1');
      const user2Result = limiter('user-2');

      expect(user1Result.allowed).toBe(true);
      expect(user2Result.allowed).toBe(true);

      limiter('user-1');
      expect(limiter('user-1').allowed).toBe(false);

      // user-2 should still have requests available
      expect(limiter('user-2').allowed).toBe(true);
    });

    it('provides resetAt timestamp', () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
      const result = limiter('user-123');

      expect(result.resetAt).toBeGreaterThan(Date.now());
      expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('Pre-configured limiters', () => {
    it('sensitiveWriteLimiter has correct limits', () => {
      const result = sensitiveWriteLimiter('ip-1');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });

    it('generalApiLimiter has correct limits', () => {
      const result = generalApiLimiter('user-1');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });

    it('authLimiter has correct limits', () => {
      const result = authLimiter('ip-2');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });
  });
});
