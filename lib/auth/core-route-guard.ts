import { NextRequest, NextResponse } from 'next/server';
import type { AuthRole } from '@/types/auth';
import { createRateLimiter, type RateLimitResult } from '@/lib/utils/throttle';
import { logger } from '@/lib/utils/logger';

export type RateLimitProfile = 'read' | 'write' | 'admin';

interface CoreRouteGuardOptions {
  route: string;
  allowedRoles: AuthRole[];
  rateLimitProfile: RateLimitProfile;
}

interface CoreRouteGuardDependencies {
  readLimiter?: (key: string) => RateLimitResult;
  writeLimiter?: (key: string) => RateLimitResult;
  adminLimiter?: (key: string) => RateLimitResult;
}

const readLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 100 });
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20 });
const adminLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });

function normalizeRole(value: string | null | undefined): AuthRole | null {
  if (!value) {
    return null;
  }

  const candidate = value.toLowerCase();
  if (candidate === 'admin' || candidate === 'recruiter' || candidate === 'trade') {
    return candidate;
  }

  return null;
}

function getRoleFromHeader(request: NextRequest): AuthRole | null {
  return normalizeRole(request.headers.get('x-user-role'));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getAccessTokenFromCookie(request: NextRequest): string | null {
  const raw = request.cookies.get('sb-access-token')?.value;
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

function getRoleFromToken(request: NextRequest): AuthRole | null {
  const token = getAccessTokenFromCookie(request);
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const appMetadata = payload.app_metadata;
  if (typeof appMetadata === 'object' && appMetadata !== null) {
    const roleValue = (appMetadata as Record<string, unknown>).role;
    if (typeof roleValue === 'string') {
      const normalized = normalizeRole(roleValue);
      if (normalized) {
        return normalized;
      }
    }
  }

  const directRoleKeys = ['role', 'user_role'];
  for (const key of directRoleKeys) {
    const roleValue = payload[key];
    if (typeof roleValue === 'string') {
      const normalized = normalizeRole(roleValue);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function resolveRole(request: NextRequest): AuthRole | null {
  const fromHeader = getRoleFromHeader(request);
  if (fromHeader) {
    return fromHeader;
  }
  return getRoleFromToken(request);
}

function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`;
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown-client';
}

function createJsonError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): NextResponse {
  const response = new NextResponse(
    JSON.stringify({
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      ...extra,
    }),
    {
      status,
      headers: {
        'content-type': 'application/json',
      },
    },
  );

  response.headers.set('x-request-id', requestId);
  return response;
}

function selectLimiter(
  profile: RateLimitProfile,
  dependencies?: CoreRouteGuardDependencies,
): (key: string) => RateLimitResult {
  if (profile === 'admin') {
    return dependencies?.adminLimiter ?? adminLimiter;
  }
  if (profile === 'write') {
    return dependencies?.writeLimiter ?? writeLimiter;
  }
  return dependencies?.readLimiter ?? readLimiter;
}

export function enforceCoreRouteGuard(
  request: NextRequest,
  options: CoreRouteGuardOptions,
  dependencies?: CoreRouteGuardDependencies,
): NextResponse | null {
  const requestId = getRequestId(request);
  const resolvedRole = resolveRole(request);

  if (resolvedRole && !options.allowedRoles.includes(resolvedRole)) {
    logger.warn('core_route_forbidden_role', {
      route: options.route,
      role: resolvedRole,
      requestId,
    });

    return createJsonError(
      requestId,
      403,
      'FORBIDDEN',
      'You do not have permission to access this route.',
    );
  }

  const limiter = selectLimiter(options.rateLimitProfile, dependencies);
  const clientId = getClientIdentifier(request);
  const limitKey = `${options.rateLimitProfile}:${options.route}:${resolvedRole || 'unknown'}:${clientId}`;
  const rateLimit = limiter(limitKey);

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

    logger.warn('core_route_rate_limited', {
      route: options.route,
      role: resolvedRole || 'unknown',
      requestId,
      retryAfterSeconds,
    });

    const response = createJsonError(
      requestId,
      429,
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please retry later.',
      { retryAfterSeconds },
    );

    response.headers.set('retry-after', String(retryAfterSeconds));
    response.headers.set('x-rate-limit-remaining', '0');
    response.headers.set('x-rate-limit-reset', String(rateLimit.resetAt));
    return response;
  }

  return null;
}
