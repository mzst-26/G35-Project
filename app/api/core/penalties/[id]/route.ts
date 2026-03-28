import { NextRequest, NextResponse } from 'next/server';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';

// TODO(payments-penalties-service): Move penalty detail proxy target to the
// dedicated Payments & Penalties service route once available.

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isValidPenaltyId(id: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(id) || /^\d+$/.test(id);
}

async function resolvePenaltyId(params: Promise<{ id: string }>): Promise<string | NextResponse> {
  const { id } = await params;
  if (!isValidPenaltyId(id)) {
    return new NextResponse(JSON.stringify({
      code: 'INVALID_PATH_PARAM',
      message: 'Invalid penalty ID format',
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
  const penaltyId = await resolvePenaltyId(params);
  if (penaltyId instanceof NextResponse) {
    return penaltyId;
  }

  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/penalties/:id',
    allowedRoles: ['admin', 'trade'],
    rateLimitProfile: 'read',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    return proxyCoreRequest(request, {
      endpoint: `/api/v1/penalties/${penaltyId}`,
    });
  });
}
