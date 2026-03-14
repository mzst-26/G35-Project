import { NextRequest, NextResponse } from 'next/server';
import { proxyIdentityRequest } from '@/lib/auth/proxy';

export async function POST(request: NextRequest) {
  try {
    return await proxyIdentityRequest(request, '/api/auth/mfa/enroll');
  } catch {
    return NextResponse.json(
      { code: 'IDENTITY_UNAVAILABLE', message: 'Identity service is currently unavailable.' },
      { status: 502 },
    );
  }
}
