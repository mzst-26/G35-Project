import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../../../app/api/core/jobs/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

type MockedFn = ReturnType<typeof vi.fn>;

describe('app/api/core/jobs/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies jobs list via session bridge', async () => {
    const proxiedResponse = new NextResponse(JSON.stringify({ items: [] }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(proxiedResponse);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/jobs?limit=20');
    const response = await GET(request);

    expect(withSessionBridge).toHaveBeenCalledTimes(1);
    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/jobs',
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

    const request = new NextRequest('http://localhost:3000/api/core/jobs');
    const response = await GET(request);

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('proxies create job POST via session bridge', async () => {
    const proxiedResponse = new NextResponse(JSON.stringify({ data: { id: 'job-123' } }), {
      status: 201,
      headers: {
        'content-type': 'application/json',
      },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(proxiedResponse);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/jobs', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Electrician - London',
        startAt: '2026-04-02T00:00:00.000Z',
        endAt: '2026-04-03T00:00:00.000Z',
        salary: 616,
        currency: 'GBP',
        companyId: '5d17de66-4029-4e84-9152-94f28b5eb532',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
    const response = await POST(request);

    expect(withSessionBridge).toHaveBeenCalledTimes(1);
    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/jobs',
      method: 'POST',
    });
    expect(response.status).toBe(201);
  });
});
