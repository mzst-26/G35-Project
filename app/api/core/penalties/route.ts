import { NextRequest, NextResponse } from 'next/server';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';

// TODO(payments-penalties-service): Move penalties proxy target to the dedicated
// Payments & Penalties service route once available.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/penalties',
    allowedRoles: ['admin', 'trade'],
    rateLimitProfile: 'read',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    return proxyCoreRequest(request, {
      endpoint: '/api/v1/penalties',
    });
  });
}
