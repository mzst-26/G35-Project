import { NextRequest, NextResponse } from 'next/server';

import { proxyIdentityRequest } from '@/lib/auth/proxy';

/**
 * Proxies to the identity service. On 5xx, check:
 * - Next.js server console for [identity proxy] upstream 5xx log
 * - Identity service logs (backend/services/identity) for "registration submit: insert failed"
 * - Identity .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; table company_registration_requests must exist
 */
export async function POST(request: NextRequest) {
  try {
    return await proxyIdentityRequest(request, '/api/auth/recruiter-registration');
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
