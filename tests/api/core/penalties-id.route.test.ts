import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../../../app/api/core/penalties/[id]/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

type MockedFn = ReturnType<typeof vi.fn>;

describe('app/api/core/penalties/[id]/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies penalty detail via session bridge', async () => {
    const proxiedResponse = new NextResponse(JSON.stringify({ data: { id: '123' } }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(proxiedResponse);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/penalties/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    expect(withSessionBridge).toHaveBeenCalledTimes(1);
    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/penalties/123',
    });
    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid penalty id and does not proxy', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/penalties/invalid-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id!' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_PATH_PARAM');
    expect(withSessionBridge).not.toHaveBeenCalled();
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });

  it('returns session bridge response on auth failure path', async () => {
    const unauthorized = new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: {
        'content-type': 'application/json',
      },
    });

    (withSessionBridge as MockedFn).mockResolvedValueOnce(unauthorized);

    const request = new NextRequest('http://localhost:3000/api/core/penalties/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });
});
