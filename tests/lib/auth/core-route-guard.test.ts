import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';
import type { RateLimitResult } from '@/lib/utils/throttle';

function createAllowedRateResult(): RateLimitResult {
  return {
    allowed: true,
    remaining: 99,
    resetAt: Date.now() + 60_000,
  };
}

describe('enforceCoreRouteGuard', () => {
  it('returns 403 when user role is not allowed', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      headers: {
        'x-user-role': 'trade',
        'x-request-id': 'req-forbidden-1',
      },
    });

    const response = enforceCoreRouteGuard(request, {
      route: '/api/core/admin/settings',
      allowedRoles: ['admin'],
      rateLimitProfile: 'admin',
    });

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    const body = await response?.json();
    expect(body.code).toBe('FORBIDDEN');
    expect(body.requestId).toBe('req-forbidden-1');
  });

  it('returns 429 with retry-after headers when rate limit is exceeded', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/payments', {
      headers: {
        'x-user-role': 'recruiter',
        'x-forwarded-for': '198.51.100.10',
        'x-request-id': 'req-rate-limited-1',
      },
    });

    const response = enforceCoreRouteGuard(
      request,
      {
        route: '/api/core/payments',
        allowedRoles: ['admin', 'recruiter'],
        rateLimitProfile: 'read',
      },
      {
        readLimiter: vi.fn().mockReturnValue({
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + 30_000,
        }),
      },
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    expect(response?.headers.get('retry-after')).toBeTruthy();
    expect(response?.headers.get('x-rate-limit-remaining')).toBe('0');

    const body = await response?.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.requestId).toBe('req-rate-limited-1');
    expect(typeof body.retryAfterSeconds).toBe('number');
  });

  it('returns null when role is allowed and request is under limit', () => {
    const request = new NextRequest('http://localhost:3000/api/core/workers', {
      headers: {
        'x-user-role': 'trade',
        'x-forwarded-for': '203.0.113.50',
      },
    });

    const response = enforceCoreRouteGuard(
      request,
      {
        route: '/api/core/workers',
        allowedRoles: ['admin', 'recruiter', 'trade'],
        rateLimitProfile: 'read',
      },
      {
        readLimiter: vi.fn().mockReturnValue(createAllowedRateResult()),
      },
    );

    expect(response).toBeNull();
  });
});
