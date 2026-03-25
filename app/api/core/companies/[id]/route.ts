import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';

const updateCompanySchema = z.object({
  company_name: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function validateCompanyId(id: string): Promise<boolean> {
  return /^[a-f0-9-]{36}$/.test(id) || /^\d+$/.test(id);
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const isValid = await validateCompanyId(id);

  if (!isValid) {
    return new NextResponse(JSON.stringify({
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid company ID format',
      requestId: `req-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return withSessionBridge(request, async () => {
    return proxyCoreRequest(request, {
      endpoint: `/api/v1/companies/${id}`,
    });
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const isValid = await validateCompanyId(id);

  if (!isValid) {
    return new NextResponse(JSON.stringify({
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid company ID format',
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

    const validationResult = updateCompanySchema.safeParse(body);
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
      endpoint: `/api/v1/companies/${id}`,
      method: 'PATCH',
    });
  });
}
