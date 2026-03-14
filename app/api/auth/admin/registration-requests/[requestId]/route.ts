import { NextRequest, NextResponse } from 'next/server';

import { proxyIdentityRequest } from '@/lib/auth/proxy';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await context.params;
    return await proxyIdentityRequest(request, `/api/auth/admin/registration-requests/${requestId}`);
  } catch {
    return NextResponse.json(
      {
        code: 'IDENTITY_UNAVAILABLE',
        message: 'Identity service is currently unavailable.',
      },
      { status: 502 },
    );
  }
}
