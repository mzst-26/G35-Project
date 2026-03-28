import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';
import { logger } from '@/lib/utils/logger';

const updateJobSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function validateJobId(id: string): Promise<boolean> {
  return /^[a-f0-9-]{36}$/.test(id) || /^\d+$/.test(id);
}

async function validateAndGetId(params: Promise<{ id: string }>): Promise<string | NextResponse> {
  const { id } = await params;
  const isValid = await validateJobId(id);

  if (!isValid) {
    return new NextResponse(JSON.stringify({
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid job ID format',
      requestId: `req-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return id;
}

function buildDeleteNotSupportedResponse(request: NextRequest): NextResponse {
  const requestId = request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`;

  logger.warn('job_delete_not_supported', {
    route: '/api/core/jobs/:id',
    method: 'DELETE',
    requestId,
  });

  return new NextResponse(JSON.stringify({
    code: 'JOB_DELETE_NOT_SUPPORTED',
    message: 'Deleting jobs is not supported. Use status transition endpoints instead.',
    requestId,
    timestamp: new Date().toISOString(),
  }), {
    status: 405,
    headers: {
      'content-type': 'application/json',
      allow: 'GET, PATCH',
    },
  });
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const idOrError = await validateAndGetId(params);
  if (idOrError instanceof NextResponse) return idOrError;

  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/jobs/:id',
    allowedRoles: ['admin', 'recruiter', 'trade'],
    rateLimitProfile: 'read',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    return proxyCoreRequest(request, {
      endpoint: `/api/v1/jobs/${idOrError}`,
    });
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const idOrError = await validateAndGetId(params);
  if (idOrError instanceof NextResponse) return idOrError;

  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/jobs/:id',
    allowedRoles: ['admin', 'recruiter', 'trade'],
    rateLimitProfile: 'write',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new NextResponse(JSON.stringify({
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        requestId: request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const validationResult = updateJobSchema.safeParse(body);
    if (!validationResult.success) {
      return new NextResponse(JSON.stringify({
        code: 'CLIENT_VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: validationResult.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        requestId: request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    return proxyCoreRequest(request, {
      endpoint: `/api/v1/jobs/${idOrError}`,
      method: 'PATCH',
    });
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const idOrError = await validateAndGetId(params);
  if (idOrError instanceof NextResponse) return idOrError;

  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/jobs/:id',
    allowedRoles: ['admin', 'recruiter', 'trade'],
    rateLimitProfile: 'write',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    return buildDeleteNotSupportedResponse(request);
  });
}
