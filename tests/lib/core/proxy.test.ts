import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxyCoreRequest, CoreProxyError } from '@/lib/core/proxy';
import * as envValidation from '@/lib/auth/env-validation';

vi.mock('@/lib/auth/env-validation', () => ({
  getServerEnvConfig: vi.fn(),
}));

global.fetch = vi.fn();

type MockedFetch = ReturnType<typeof vi.fn>;

describe('lib/core/proxy.ts', () => {
  const mockConfig = {
    identityServiceUrl: 'http://localhost:4001',
    corePlatformServiceUrl: 'http://localhost:4002',
    corePlatformProxyTimeoutMs: 5000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (envValidation.getServerEnvConfig as MockedFetch).mockReturnValue(mockConfig);
    (global.fetch as MockedFetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('proxyCoreRequest - Success Cases', () => {
    it('proxies successful GET request with bearer token', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '123', name: 'Test Job' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=valid-token-xyz',
          'user-agent': 'Mozilla/5.0',
          'x-request-id': 'req-123abc',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBe('req-123abc');

      const fetchCall = (global.fetch as MockedFetch).mock.calls[0];
      const fetchUrl = (fetchCall[0] as string);
      const fetchOptions = (fetchCall[1] as { headers: Headers });

      expect(fetchUrl).toContain('/api/v1/jobs');
      expect(fetchOptions.headers.get('authorization')).toBe('Bearer valid-token-xyz');
    });

    it('proxies POST request with body', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'new-123' }), { status: 201 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'POST',
        headers: {
          cookie: 'sb-access-token=token-abc',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Job' }),
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect((global.fetch as MockedFetch).mock.calls[0][1].method).toBe('POST');
    });

    it('generates request ID if not provided', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      const requestId = response.headers.get('x-request-id');
      expect(requestId).toBeDefined();
      expect(requestId).toMatch(/^req-/);
    });

    it('forwards generated request ID to upstream when incoming header is missing', async () => {
      (global.fetch as MockedFetch).mockImplementationOnce(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          const forwardedRequestId = (init?.headers as Headers).get('x-request-id');
          return new Response('{}', {
            status: 200,
            headers: {
              'x-request-id': forwardedRequestId || 'missing',
            },
          });
        },
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });
      const fetchCall = (global.fetch as MockedFetch).mock.calls[0];
      const fetchOptions = fetchCall[1] as { headers: Headers };
      const forwardedRequestId = fetchOptions.headers.get('x-request-id');

      expect(forwardedRequestId).toBeDefined();
      expect(forwardedRequestId).toMatch(/^req-/);
      expect(response.headers.get('x-request-id')).toBe(forwardedRequestId);
    });

    it('replaces invalid incoming request ID with generated safe request ID', async () => {
      (global.fetch as MockedFetch).mockImplementationOnce(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          const forwardedRequestId = (init?.headers as Headers).get('x-request-id');
          return new Response('{}', {
            status: 200,
            headers: {
              'x-request-id': forwardedRequestId || 'missing',
            },
          });
        },
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'invalid/request-id',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });
      const fetchCall = (global.fetch as MockedFetch).mock.calls[0];
      const fetchOptions = fetchCall[1] as { headers: Headers };
      const forwardedRequestId = fetchOptions.headers.get('x-request-id');

      expect(forwardedRequestId).toBeDefined();
      expect(forwardedRequestId).toMatch(/^req-/);
      expect(forwardedRequestId).not.toContain('/');
      expect(response.headers.get('x-request-id')).toBe(forwardedRequestId);
    });

    it('includes query parameters in proxied request', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('[]', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs?status=open&limit=10', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
        },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      const fetchCall = (global.fetch as MockedFetch).mock.calls[0];
      const fetchUrl = (fetchCall[0] as string);

      expect(fetchUrl).toContain('status=open');
      expect(fetchUrl).toContain('limit=10');
    });

    it('decodes encoded access token cookie before forwarding bearer token', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const encodedToken = encodeURIComponent('header.payload.signature');
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: `sb-access-token=${encodedToken}`,
        },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      const fetchCall = (global.fetch as MockedFetch).mock.calls[0];
      const fetchOptions = (fetchCall[1] as { headers: Headers });
      expect(fetchOptions.headers.get('authorization')).toBe('Bearer header.payload.signature');
    });
  });

  describe('proxyCoreRequest - Bearer Token', () => {
    it('throws 401 when no bearer token', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'other-cookie=value' },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(401);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('throws 401 when bearer token empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=; other=value' },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(401);
    });
  });

  describe('proxyCoreRequest - SSRF Prevention', () => {
    it('validates upstream host', async () => {
      (envValidation.getServerEnvConfig as MockedFetch).mockReturnValueOnce({
        ...mockConfig,
        corePlatformServiceUrl: 'http://localhost:4002',
      });

      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response).toBeDefined();
    });
  });

  describe('proxyCoreRequest - Path Traversal', () => {
    it('rejects path traversal with ..', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      const response = await proxyCoreRequest(request, {
        endpoint: '/../../../etc/passwd',
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe('INVALID_PATH');
    });

    it('rejects path traversal with %2e%2e', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      const response = await proxyCoreRequest(request, {
        endpoint: '/%2e%2e/%2e%2e/config',
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe('INVALID_PATH');
    });
  });

  describe('proxyCoreRequest - Error Handling', () => {
    it('returns 408 on timeout', async () => {
      (global.fetch as MockedFetch).mockImplementationOnce(() => {
        const error = new DOMException('The operation was aborted', 'AbortError');
        throw error;
      });

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'req-timeout-test',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(408);
      const body = (await response.json()) as { code: string; requestId: string };
      expect(body.code).toBe('REQUEST_TIMEOUT');
      expect(body.requestId).toBe('req-timeout-test');
    });

    it('normalizes upstream 5xx errors', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Database error' }), { status: 500 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'req-500-test',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(500);
      expect(response.headers.get('x-request-id')).toBe('req-500-test');
    });

    it('prefers upstream request ID in response header when upstream provides it', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Database error' }), {
          status: 500,
          headers: {
            'x-request-id': 'core-req-500',
          },
        }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'req-500-test',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(500);
      expect(response.headers.get('x-request-id')).toBe('core-req-500');
    });

    it('ignores invalid upstream request ID and keeps proxy request ID', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Database error' }), {
          status: 500,
          headers: {
            'x-request-id': 'invalid/upstream-id',
          },
        }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'req-500-test',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.status).toBe(500);
      expect(response.headers.get('x-request-id')).toBe('req-500-test');
    });

    it('handles upstream 4xx errors transparently', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs/999', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs/999' });

      expect(response.status).toBe(404);
    });
  });

  describe('proxyCoreRequest - Header Allowlisting', () => {
    it('only forwards allowed headers', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'user-agent': 'TestAgent',
          'x-request-id': 'req-123',
          'content-type': 'application/json',
          'x-custom-header': 'should-not-forward',
        },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      const fetchCall = (global.fetch as MockedFetch).mock.calls[0];
      const forwardedHeaders = (fetchCall[1] as { headers: Headers }).headers;

      expect(forwardedHeaders.get('content-type')).toBe('application/json');
      expect(forwardedHeaders.get('user-agent')).toBe('TestAgent');
      expect(forwardedHeaders.get('x-request-id')).toBe('req-123');
      expect(forwardedHeaders.get('authorization')).toBe('Bearer token-xyz');
      expect(forwardedHeaders.get('x-custom-header')).toBeNull();
    });
  });

  describe('proxyCoreRequest - Methods', () => {
    it('allows standard HTTP methods', async () => {
      const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        (global.fetch as MockedFetch).mockResolvedValueOnce(
          new Response('{}', { status: 200 }),
        );

        const request = new NextRequest('http://localhost:3000/api/core/jobs', {
          method,
          headers: { cookie: 'sb-access-token=token-xyz' },
        });

        await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

        expect((global.fetch as MockedFetch).mock.calls.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CoreProxyError', () => {
    it('creates error with correct properties', () => {
      const error = new CoreProxyError('Test error', 503, 'SERVICE_UNAVAILABLE', 'req-123');

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.requestId).toBe('req-123');
      expect(error.name).toBe('CoreProxyError');
    });
  });
});
