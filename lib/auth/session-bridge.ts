import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAMES = ['sb-access-token', 'sb-refresh-token'];
const CSRF_COOKIE_NAME = 'csrf-token';

export interface SessionBridgeResult {
  accessToken: string;
  csrfToken: string | null;
}

export class SessionBridgeError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'SessionBridgeError';
    this.status = status;
    this.code = code;
  }
}

export async function extractSessionFromRequest(request: NextRequest): Promise<SessionBridgeResult> {
  const cookieHeader = request.headers.get('cookie') || '';

  const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
  const accessToken = accessTokenMatch ? decodeURIComponent(accessTokenMatch[1]) : null;

  if (!accessToken) {
    throw new SessionBridgeError(
      'No valid session found',
      401,
      'UNAUTHORIZED',
    );
  }

  const csrfTokenMatch = cookieHeader.match(/csrf-token=([^;]+)/);
  const csrfToken = csrfTokenMatch ? decodeURIComponent(csrfTokenMatch[1]) : null;

  return {
    accessToken,
    csrfToken,
  };
}

export function validateCsrfForMethod(method: string, csrfToken: string | null, headerCsrfToken: string | null): void {
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (requiresCsrf) {
    if (!headerCsrfToken) {
      throw new SessionBridgeError(
        'CSRF token required for state-changing request',
        403,
        'CSRF_TOKEN_MISSING',
      );
    }

    if (!csrfToken || csrfToken !== headerCsrfToken) {
      throw new SessionBridgeError(
        'CSRF token mismatch',
        403,
        'CSRF_TOKEN_INVALID',
      );
    }
  }
}

export function createErrorResponse(error: unknown, requestId?: string): NextResponse {
  if (error instanceof SessionBridgeError) {
    const body = JSON.stringify({
      code: error.code,
      message: error.message,
      requestId: requestId || `req-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    });

    return new NextResponse(body, {
      status: error.status,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId || `req-${crypto.randomUUID()}`,
      },
    });
  }

  // Unknown error, normalize to 500
  const body = JSON.stringify({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    requestId: requestId || `req-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
  });

  return new NextResponse(body, {
    status: 500,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId || `req-${crypto.randomUUID()}`,
    },
  });
}

export async function withSessionBridge(
  request: NextRequest,
  handler: (session: SessionBridgeResult) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`;

  try {
    const session = await extractSessionFromRequest(request);

    const headerCsrfToken = request.headers.get('x-csrf-token');
    validateCsrfForMethod(request.method, session.csrfToken, headerCsrfToken);

    return await handler(session);
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}
