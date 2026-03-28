import { NextRequest, NextResponse } from 'next/server';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isValidPaymentId(id: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(id) || /^\d+$/.test(id);
}

async function resolvePaymentId(params: Promise<{ id: string }>): Promise<string | NextResponse> {
  const { id } = await params;
  if (!isValidPaymentId(id)) {
    return new NextResponse(JSON.stringify({
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid payment ID format',
      requestId: `req-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  return id;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const paymentId = await resolvePaymentId(params);
  if (paymentId instanceof NextResponse) {
    return paymentId;
  }

  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/payments/:id',
    allowedRoles: ['admin', 'recruiter'],
    rateLimitProfile: 'read',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    return proxyCoreRequest(request, {
      endpoint: `/api/v1/payments/${paymentId}`,
    });
  });
}
