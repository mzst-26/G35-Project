import { NextRequest, NextResponse } from 'next/server';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withSessionBridge(request, async () => {
    // GET /api/core/companies?limit=20&offset=0
    return proxyCoreRequest(request, {
      endpoint: '/api/v1/companies',
    });
  });
}
