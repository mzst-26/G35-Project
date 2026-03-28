import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../../../app/api/core/companies/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

type MockedFn = ReturnType<typeof vi.fn>;

describe('app/api/core/companies/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies companies list via session bridge', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/core/companies?status=active&limit=20');
    const response = await GET(request);

    expect(withSessionBridge).toHaveBeenCalledTimes(1);
    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/companies',
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

    const request = new NextRequest('http://localhost:3000/api/core/companies');
    const response = await GET(request);

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });
});
