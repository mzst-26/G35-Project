import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_IDENTITY_URL = 'http://localhost:4001';

function getIdentityServiceUrl(): string {
  return process.env.IDENTITY_SERVICE_URL ?? DEFAULT_IDENTITY_URL;
}

function buildIdentityHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const cookie = request.headers.get('cookie');
  const csrfHeader = request.headers.get('x-csrf-token');
  const userAgent = request.headers.get('user-agent');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRequestId = request.headers.get('x-request-id');

  if (contentType) {
    headers.set('content-type', contentType);
  }
  if (cookie) {
    headers.set('cookie', cookie);
  }
  if (csrfHeader) {
    headers.set('x-csrf-token', csrfHeader);
  }
  if (userAgent) {
    headers.set('user-agent', userAgent);
  }
  if (xForwardedFor) {
    headers.set('x-forwarded-for', xForwardedFor);
  }
  if (xRequestId) {
    headers.set('x-request-id', xRequestId);
  }

  return headers;
}

function readSetCookieHeaders(response: Response): string[] {
  const getSetCookie = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(response.headers);
  }

  const combined = response.headers.get('set-cookie');
  return combined ? [combined] : [];
}

export async function proxyIdentityRequest(
  request: NextRequest,
  endpoint: string,
): Promise<NextResponse> {
  const targetUrl = `${getIdentityServiceUrl()}${endpoint}`;
  const method = request.method;
  const headers = buildIdentityHeaders(request);

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : await request.text(),
    redirect: 'manual',
    cache: 'no-store',
  });

  const responseText = await upstreamResponse.text();
  const nextResponse = new NextResponse(responseText, {
    status: upstreamResponse.status,
  });

  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType) {
    nextResponse.headers.set('content-type', contentType);
  }

  for (const cookie of readSetCookieHeaders(upstreamResponse)) {
    nextResponse.headers.append('set-cookie', cookie);
  }

  return nextResponse;
}
