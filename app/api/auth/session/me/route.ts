import { NextRequest, NextResponse } from 'next/server';

import { proxyIdentityRequest } from '@/lib/auth/proxy';

function decodeSessionIdFromAccessToken(token?: string): string | undefined {
  if (!token) {
    return undefined;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      session_id?: unknown;
    };
    return typeof payload.session_id === 'string' ? payload.session_id : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  try {
    const upstream = await proxyIdentityRequest(request, '/api/auth/session/me');

    if (!upstream.ok) {
      return upstream;
    }

    const payload = await upstream.json();
    const sessionId = decodeSessionIdFromAccessToken(request.cookies.get('sb-access-token')?.value);

    return NextResponse.json(
      {
        ...payload,
        sessionId,
      },
      { status: upstream.status },
    );
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
