import { NextRequest, NextResponse } from 'next/server';

interface ErrorEnvelope {
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
}

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

function getOrCreateRequestId(request: NextRequest): string {
  const requestId = request.headers.get('x-request-id');
  if (requestId) {
    return requestId;
  }
  return `req-${crypto.randomUUID()}`;
}

function jsonError(status: number, requestId: string): NextResponse {
  const body: ErrorEnvelope = {
    code: 'SESSION_BRIDGE_ERROR',
    message: 'Failed to process session bridge request',
    requestId,
    timestamp: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
  });
}

function parseCookies(request: NextRequest): Record<string, string> {
  const rawCookie = request.headers.get('cookie') ?? '';
  const parsed: Record<string, string> = {};

  for (const part of rawCookie.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key) continue;

    try {
      parsed[key] = decodeURIComponent(value);
    } catch {
      parsed[key] = value;
    }
  }

  return parsed;
}

export async function extractSessionFromRequest(request: NextRequest): Promise<SessionBridgeResult> {
  const cookies = parseCookies(request);
  const accessToken = cookies['sb-access-token'];

  if (!accessToken) {
    throw new SessionBridgeError('Authentication required', 401, 'UNAUTHORIZED');
  }

  return {
    accessToken,
    csrfToken: cookies['csrf-token'] ?? null,
  };
}

export function validateCsrfForMethod(
  method: string,
  cookieCsrfToken: string | null,
  headerCsrfToken: string | null,
): void {
  const normalizedMethod = method.toUpperCase();
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod);

  if (!requiresCsrf) {
    return;
  }

  if (!cookieCsrfToken || !headerCsrfToken || cookieCsrfToken !== headerCsrfToken) {
    throw new SessionBridgeError('Invalid CSRF token', 403, 'CSRF_TOKEN_INVALID');
  }
}

export function createErrorResponse(error: unknown, requestId?: string): NextResponse {
  const resolvedRequestId = requestId ?? `req-${crypto.randomUUID()}`;

  if (error instanceof SessionBridgeError) {
    return new NextResponse(
      JSON.stringify({
        code: error.code,
        message: error.message,
        requestId: resolvedRequestId,
        timestamp: new Date().toISOString(),
      } satisfies ErrorEnvelope),
      {
        status: error.status,
        headers: {
          'content-type': 'application/json',
          'x-request-id': resolvedRequestId,
        },
      },
    );
  }

  return new NextResponse(
    JSON.stringify({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId: resolvedRequestId,
      timestamp: new Date().toISOString(),
    } satisfies ErrorEnvelope),
    {
      status: 500,
      headers: {
        'content-type': 'application/json',
        'x-request-id': resolvedRequestId,
      },
    },
  );
}

export async function withSessionBridge(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(request);

  try {
    const response = await handler();
    if (!response.headers.get('x-request-id')) {
      response.headers.set('x-request-id', requestId);
    }
    return response;
  } catch {
    return jsonError(502, requestId);
  }
}
