import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionMe, refreshSession, requestOtp } from '@/lib/auth/client';

describe('auth client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());

    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'csrf-token=test-csrf-token',
      configurable: true,
    });
  });

  it('attaches csrf header for mutating refresh requests', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ expiresAt: 1735689600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;

    expect(headers.get('x-csrf-token')).toBe('test-csrf-token');
  });

  it('retries session lookup after TOKEN_EXPIRED and refresh success', async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ expiresAt: 1735689600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: 'u1', email: 'x@y.com', role: 'trade', stepUpVerified: false, expiresAt: 1735689600 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await getSessionMe();

    expect(result.user.id).toBe('u1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/session/refresh');
  });

  it('submits otp request payload', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ messageId: 'm1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await requestOtp('person@example.com');

    expect(response.messageId).toBe('m1');
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ email: 'person@example.com' }));
  });
});
