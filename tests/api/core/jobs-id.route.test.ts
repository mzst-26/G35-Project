import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { DELETE } from '../../../app/api/core/jobs/[id]/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';
import { logger } from '../../../lib/utils/logger';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

vi.mock('../../../lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

type MockedFn = ReturnType<typeof vi.fn>;

describe('app/api/core/jobs/[id]/route.ts DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns explicit 405 for delete attempts and never proxies upstream', async () => {
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/jobs/123', {
      method: 'DELETE',
      headers: {
        'x-request-id': 'req-delete-attempt-123',
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, PATCH');
    expect(body.code).toBe('JOB_DELETE_NOT_SUPPORTED');
    expect(body.requestId).toBe('req-delete-attempt-123');
    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('job_delete_not_supported', {
      route: '/api/core/jobs/:id',
      method: 'DELETE',
      requestId: 'req-delete-attempt-123',
    });
  });

  it('passes through unauthorized response from session bridge', async () => {
    const unauthorized = new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: {
        'content-type': 'application/json',
      },
    });

    (withSessionBridge as MockedFn).mockResolvedValueOnce(unauthorized);

    const request = new NextRequest('http://localhost:3000/api/core/jobs/123', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(401);
    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
