import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';

const jobParamsSchema = z.object({
  tradeType: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  workersNeeded: z.number().int().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
}).strict();

const chatParseRequestSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  currentParams: jobParamsSchema.optional().default({}),
}).strict();

function buildRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`;
}

function createJsonError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  issues?: Array<{ field: string; message: string }>,
): NextResponse {
  return new NextResponse(JSON.stringify({
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    issues,
  }), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/chat/parse',
    allowedRoles: ['admin', 'recruiter'],
    rateLimitProfile: 'write',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    const requestId = buildRequestId(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createJsonError(
        requestId,
        400,
        'INVALID_JSON',
        'Request body must be valid JSON',
      );
    }

    const validation = chatParseRequestSchema.safeParse(body);
    if (!validation.success) {
      return createJsonError(
        requestId,
        400,
        'CLIENT_VALIDATION_ERROR',
        'Request validation failed',
        validation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    return proxyCoreRequest(request, {
      endpoint: '/api/v1/chat/parse',
      method: 'POST',
    });
  });
}
