import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';

const createJobSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed']).default('draft'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withSessionBridge(request, async () => {
    // GET /api/core/jobs?status=open&limit=50&offset=0
    const response = await proxyCoreRequest(request, {
      endpoint: '/api/v1/jobs',
    });

    return response;
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withSessionBridge(request, async () => {
    // Parse and validate request body
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

    // Validate against schema
    const validationResult = createJobSchema.safeParse(body);
    if (!validationResult.success) {
      return new NextResponse(JSON.stringify({
        code: 'CLIENT_VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: validationResult.error.errors.map((err) => ({
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
      endpoint: '/api/v1/jobs',
      method: 'POST',
    });
  });
}
