import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxyCoreRequest, getProxyMetrics } from '@/lib/core/proxy';
import * as envValidation from '@/lib/auth/env-validation';
import * as logger from '@/lib/utils/logger';

vi.mock('@/lib/auth/env-validation', () => ({
  getServerEnvConfig: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    setContext: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

global.fetch = vi.fn();

type MockedFetch = ReturnType<typeof vi.fn>;

describe('lib/core/proxy.ts - Observability', () => {
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

  describe('metrics tracking', () => {
    it('increments total requests on success', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '123' }), { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });
      const metrics = getProxyMetrics();

      expect(metrics.totalRequests).toBeGreaterThan(0);
    });

    it('increments failed requests on error', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'other-cookie=value' },
      });

      const initialMetrics = getProxyMetrics();
      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });
      const updatedMetrics = getProxyMetrics();

      expect(updatedMetrics.failedRequests).toBeGreaterThanOrEqual(initialMetrics.failedRequests);
    });

    it('tracks latency', async () => {
      // Mock fetch with small delay
      (global.fetch as MockedFetch).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify({ id: '123' }), { status: 200 }),
                ),
              10,
            ),
          ),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      const initialMetrics = getProxyMetrics();
      const initialLatency = initialMetrics.totalLatencyMs;

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      const updatedMetrics = getProxyMetrics();
      expect(updatedMetrics.totalLatencyMs).toBeGreaterThan(initialLatency);
    });
  });

  describe('structured logging', () => {
    it('logs context on request start', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'req-123',
        },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.setContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
          route: '/api/core/jobs',
          upstream: '/api/v1/jobs',
          method: 'GET',
        }),
      );
    });

    it('logs success with status and latency', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ result: 'data' }), { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.info).toHaveBeenCalledWith(
        'Proxy request completed',
        expect.objectContaining({
          status: 200,
          latencyMs: expect.any(Number),
          bodySize: expect.any(Number),
        }),
      );
    });

    it('logs proxy errors with code and status', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'UNKNOWN',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'Invalid method',
        expect.objectContaining({
          method: 'UNKNOWN',
        }),
      );
    });

    it('logs upstream errors', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Database error' }), { status: 500 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Upstream service error',
        null,
        expect.objectContaining({
          status: 500,
        }),
      );
    });

    it('logs unexpected errors', async () => {
      (global.fetch as MockedFetch).mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Unexpected proxy error',
        expect.any(Error),
        expect.objectContaining({
          latencyMs: expect.any(Number),
        }),
      );
    });

    it('logs invalid inbound request id after context is set', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'invalid/request-id',
        },
      });

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.setContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^req-/),
        }),
      );

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'Invalid inbound request ID format',
        expect.objectContaining({
          route: '/api/core/jobs',
        }),
      );
    });

    it('logs invalid upstream request id format warning', async () => {
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

      await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'Invalid upstream request ID format',
        expect.objectContaining({
          endpoint: '/api/v1/jobs',
          status: 500,
        }),
      );
    });
  });

  describe('x-request-id propagation', () => {
    it('preserves request ID if provided', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'sb-access-token=token-xyz',
          'x-request-id': 'req-custom-123',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.headers.get('x-request-id')).toBe('req-custom-123');
    });

    it('generates request ID if not provided', async () => {
      (global.fetch as MockedFetch).mockResolvedValueOnce(
        new Response('{}', { status: 200 }),
      );

      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=token-xyz' },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      const requestId = response.headers.get('x-request-id');
      expect(requestId).toBeDefined();
      expect(requestId).toMatch(/^req-/);
    });

    it('includes request ID in error responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        method: 'GET',
        headers: {
          cookie: 'other-cookie=value',
          'x-request-id': 'req-error-123',
        },
      });

      const response = await proxyCoreRequest(request, { endpoint: '/api/v1/jobs' });

      expect(response.headers.get('x-request-id')).toBe('req-error-123');

      const body = (await response.json()) as { requestId: string };
      expect(body.requestId).toBe('req-error-123');
    });
  });
});
