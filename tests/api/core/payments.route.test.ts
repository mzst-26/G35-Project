import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../../../app/api/core/payments/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

type MockedFn = ReturnType<typeof vi.fn>;

describe('app/api/core/payments/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies payments list via session bridge', async () => {
    const proxiedResponse = new NextResponse(JSON.stringify({ data: [] }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(proxiedResponse);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/payments?status=released&limit=20');
    const response = await GET(request);

    expect(withSessionBridge).toHaveBeenCalledTimes(1);
    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/payments',
    });
    expect(response.status).toBe(200);
  });

  it('returns session bridge response on auth failure path', async () => {
    const unauthorized = new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: {
        'content-type': 'application/json',
      },
    });

    (withSessionBridge as MockedFn).mockResolvedValueOnce(unauthorized);

    const request = new NextRequest('http://localhost:3000/api/core/payments');
    const response = await GET(request);

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('returns 403 for trade role before session bridge', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/payments', {
      headers: {
        'x-user-role': 'trade',
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(withSessionBridge).not.toHaveBeenCalled();
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });
});
