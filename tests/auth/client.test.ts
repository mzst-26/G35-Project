import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSessionMe,
  mfaChallenge,
  mfaCompleteAdminLogin,
  mfaEnroll,
  mfaVerify,
  refreshSession,
  requestOtp,
} from '@/lib/auth/client';

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

  it('mfaEnroll sends POST to /api/auth/mfa/enroll', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ factorId: 'f1', totpUri: 'otpauth://...', totpSecret: 'SECRET' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await mfaEnroll();

    expect(result.factorId).toBe('f1');
    expect(result.totpSecret).toBe('SECRET');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/mfa/enroll');
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ type: 'totp', friendlyName: 'Authenticator' }));
  });

  it('mfaChallenge sends POST with factorId', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ challengeId: 'c1', expiresAt: '2026-12-31T23:59:59Z' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await mfaChallenge('factor-abc');

    expect(result.challengeId).toBe('c1');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/mfa/challenge');
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ factorId: 'factor-abc' }));
  });

  it('mfaVerify sends POST with factorId, challengeId, and code', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ verified: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await mfaVerify('f1', 'c1', '123456');

    expect(result.verified).toBe(true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/mfa/verify');
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ factorId: 'f1', challengeId: 'c1', code: '123456' }));
  });

  it('mfaCompleteAdminLogin sends POST to correct endpoint', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: 'u1', email: 'a@b.com', role: 'admin', stepUpVerified: true, expiresAt: 1735689600 }, sessionId: 's1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await mfaCompleteAdminLogin();

    expect(result.user.role).toBe('admin');
    expect(result.sessionId).toBe('s1');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/mfa/complete-admin-login');
    expect(options?.method).toBe('POST');
  });
});
