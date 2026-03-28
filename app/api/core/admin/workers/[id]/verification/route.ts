import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';

const verifyWorkerSchema = z.object({
  verified: z.boolean(),
  reason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function validateWorkerId(id: string): Promise<boolean> {
  return /^[a-f0-9-]{36}$/.test(id) || /^\d+$/.test(id);
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const isValid = await validateWorkerId(id);

  if (!isValid) {
    return new NextResponse(JSON.stringify({
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid worker ID format',
      requestId: `req-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
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

    const validationResult = verifyWorkerSchema.safeParse(body);
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
      endpoint: `/api/v1/admin/workers/${id}/verification`,
      method: 'PATCH',
    });
  });
}
