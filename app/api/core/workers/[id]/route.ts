import { NextRequest, NextResponse } from 'next/server';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function validateWorkerId(id: string): Promise<boolean> {
  return /^[a-f0-9-]{36}$/.test(id) || /^\d+$/.test(id);
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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
    return proxyCoreRequest(request, {
      endpoint: `/api/v1/workers/${id}`,
    });
  });
}
