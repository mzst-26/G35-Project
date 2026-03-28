import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../../app/api/core/chat/parse/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

type MockedFn = ReturnType<typeof vi.fn>;

function createValidBody() {
  return {
    message: 'Need 2 electricians in London next Monday',
    currentParams: {
      tradeType: 'electrician',
      location: 'London',
    },
  };
}

describe('app/api/core/chat/parse/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies valid parse request via session bridge', async () => {
    const proxied = new NextResponse(JSON.stringify({ response: 'ok', params: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(proxied);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/chat/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createValidBody()),
    });

    const response = await POST(request);

    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/chat/parse',
      method: 'POST',
    });
    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid JSON and does not proxy', async () => {
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/chat/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid-json',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_JSON');
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid payload and does not proxy', async () => {
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/chat/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '', currentParams: { workersNeeded: 0 } }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('CLIENT_VALIDATION_ERROR');
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });

  it('returns session bridge response on auth failure path', async () => {
    const unauthorized = new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

    (withSessionBridge as MockedFn).mockResolvedValueOnce(unauthorized);

    const request = new NextRequest('http://localhost:3000/api/core/chat/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createValidBody()),
    });

    const response = await POST(request);

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('returns 403 for trade role before session bridge', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/chat/parse', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-role': 'trade',
      },
      body: JSON.stringify(createValidBody()),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(withSessionBridge).not.toHaveBeenCalled();
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });
});
