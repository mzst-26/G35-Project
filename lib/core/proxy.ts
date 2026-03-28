import { NextRequest, NextResponse } from 'next/server';
import { getServerEnvConfig } from '@/lib/auth/env-validation';
import { logger } from '@/lib/utils/logger';
import { sloMonitor } from '@/lib/utils/slo-monitor';

const ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Track proxy metrics (in production, send to observability service)
interface ProxyMetrics {
  totalRequests: number;
  failedRequests: number;
  totalLatencyMs: number;
}

const metrics: ProxyMetrics = { totalRequests: 0, failedRequests: 0, totalLatencyMs: 0 };

export function getProxyMetrics() {
  return metrics;
}

interface CoreProxyOptions {
  endpoint: string;
  method?: string;
}

interface CoreProxyResponse {
  status: number;
  body: string;
  contentType: string | null;
  requestId: string | null;
}

const REQUEST_ID_MAX_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export class CoreProxyError extends Error {
  status: number;
  code: string;
  requestId?: string;

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message);
    this.name = 'CoreProxyError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function extractBearerToken(request: NextRequest): string | null {
  const raw = request.cookies.get('sb-access-token')?.value;
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

function buildCoreHeaders(request: NextRequest, bearerToken: string): Headers {
  const headers = new Headers();

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    headers.set('user-agent', userAgent);
  }

  // Add Bearer token for authentication
  headers.set('authorization', `Bearer ${bearerToken}`);

  return headers;
}

function withRequestIdHeader(headers: Headers, requestId: string): Headers {
  headers.set('x-request-id', requestId);
  return headers;
}

function isSafeRequestId(value: string): boolean {
  if (value.length === 0 || value.length > REQUEST_ID_MAX_LENGTH) {
    return false;
  }
  return REQUEST_ID_PATTERN.test(value);
}

function normalizeRequestId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!isSafeRequestId(trimmed)) {
    return null;
  }

  return trimmed;
}

function resolveInboundRequestId(request: NextRequest): {
  requestId: string;
  hadInvalidInboundRequestId: boolean;
} {
  const rawInboundRequestId = request.headers.get('x-request-id');
  const normalizedInboundRequestId = normalizeRequestId(rawInboundRequestId);

  if (normalizedInboundRequestId) {
    return {
      requestId: normalizedInboundRequestId,
      hadInvalidInboundRequestId: false,
    };
  }

  return {
    requestId: `req-${crypto.randomUUID()}`,
    hadInvalidInboundRequestId: Boolean(rawInboundRequestId),
  };
}

function validateUpstreamHost(url: string, allowedBase: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(allowedBase);
    return urlObj.hostname === baseObj.hostname;
  } catch {
    return false;
  }
}

function rejectPathTraversal(path: string): boolean {
  const dangerous = ['..', '%2e%2e', '\\', '%5c'];
  return dangerous.some((seq) => path.includes(seq));
}

function getDomainFromEndpoint(endpoint: string): string {
  const cleaned = endpoint.split('?')[0].replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  return parts[2] || parts[1] || parts[0] || 'unknown';
}

function evaluateSloAndLog(
  latencyMs: number,
  status: number,
  endpoint: string,
  timedOut = false,
  authFailure = false,
): void {
  const alerts = sloMonitor.recordObservation({
    latencyMs,
    status,
    timedOut,
    authFailure,
    domain: getDomainFromEndpoint(endpoint),
  });

  if (alerts.length > 0) {
    logger.warn('SLO alert triggered', {
      endpoint,
      status,
      latencyMs,
      alerts,
    });
  }
}

async function getCoreProxyResponse(
  targetUrl: string,
  method: string,
  headers: Headers,
  body: string | undefined,
  timeoutMs: number,
): Promise<CoreProxyResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (response.status >= 500) {
      logger.error('Upstream service error', null, {
        endpoint: new URL(targetUrl).pathname,
        status: response.status,
        bodySize: responseText.length,
      });
    }

    const contentType = response.headers.get('content-type');
    const rawUpstreamRequestId = response.headers.get('x-request-id');
    const requestId = normalizeRequestId(rawUpstreamRequestId);

    if (rawUpstreamRequestId && !requestId) {
      logger.warn('Invalid upstream request ID format', {
        endpoint: new URL(targetUrl).pathname,
        status: response.status,
      });
    }

    return {
      status: response.status,
      body: responseText,
      contentType,
      requestId,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new CoreProxyError(
        'Request timeout',
        408,
        'REQUEST_TIMEOUT',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyCoreRequest(
  request: NextRequest,
  options: CoreProxyOptions,
): Promise<NextResponse> {
  const { requestId, hadInvalidInboundRequestId } = resolveInboundRequestId(request);
  const startTime = Date.now();
  const method = options.method || request.method;

  logger.setContext({
    requestId,
    route: new URL(request.url).pathname,
    upstream: options.endpoint,
    method,
  });

  if (hadInvalidInboundRequestId) {
    logger.warn('Invalid inbound request ID format', {
      route: new URL(request.url).pathname,
    });
  }

  try {
    // Validate environment
    const config = getServerEnvConfig();

    // Validate method
    if (!ALLOWED_METHODS.includes(method)) {
      logger.warn('Invalid method', { method });
      throw new CoreProxyError(
        'Method not allowed',
        405,
        'METHOD_NOT_ALLOWED',
        requestId,
      );
    }

    // Check for path traversal attempts
    if (rejectPathTraversal(options.endpoint)) {
      throw new CoreProxyError(
        'Invalid path',
        400,
        'INVALID_PATH',
        requestId,
      );
    }

    // Extract bearer token from session
    const bearerToken = extractBearerToken(request);
    if (!bearerToken) {
      throw new CoreProxyError(
        'Unauthorized: No valid session',
        401,
        'UNAUTHORIZED',
        requestId,
      );
    }

    // Build target URL with SSRF prevention
    const query = request.nextUrl.search;
    const targetUrl = `${config.corePlatformServiceUrl}${options.endpoint}${query}`;

    // Validate upstream host to prevent SSRF
    if (!validateUpstreamHost(targetUrl, config.corePlatformServiceUrl)) {
      throw new CoreProxyError(
        'Invalid upstream host',
        400,
        'INVALID_HOST',
        requestId,
      );
    }

    // Build allowed headers and add Bearer token
    const headers = withRequestIdHeader(buildCoreHeaders(request, bearerToken), requestId);

    // Proxy request with timeout
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
    const proxyResponse = await getCoreProxyResponse(
      targetUrl,
      method,
      headers,
      body,
      config.corePlatformProxyTimeoutMs,
    );

    const latencyMs = Date.now() - startTime;
    metrics.totalRequests++;
    metrics.totalLatencyMs += latencyMs;
    evaluateSloAndLog(latencyMs, proxyResponse.status, options.endpoint);

    // Log successful proxy
    logger.info('Proxy request completed', {
      status: proxyResponse.status,
      latencyMs,
      bodySize: proxyResponse.body.length,
    });

    // Build Next response
    const nextResponse = new NextResponse(proxyResponse.body, {
      status: proxyResponse.status,
    });

    if (proxyResponse.contentType) {
      nextResponse.headers.set('content-type', proxyResponse.contentType);
    }

    nextResponse.headers.set('x-request-id', proxyResponse.requestId || requestId);
    return nextResponse;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.totalLatencyMs += latencyMs;

    if (error instanceof CoreProxyError) {
      evaluateSloAndLog(
        latencyMs,
        error.status,
        options.endpoint,
        error.code === 'REQUEST_TIMEOUT',
        error.code === 'UNAUTHORIZED',
      );

      logger.warn('Proxy error', {
        code: error.code,
        status: error.status,
        latencyMs,
      });

      const errorBody = JSON.stringify({
        code: error.code,
        message: error.message,
        requestId: error.requestId || requestId,
        timestamp: new Date().toISOString(),
      });

      const response = new NextResponse(errorBody, {
        status: error.status,
        headers: {
          'content-type': 'application/json',
          'x-request-id': error.requestId || requestId,
        },
      });

      return response;
    }

    // Unknown error, normalize to 502
    evaluateSloAndLog(latencyMs, 502, options.endpoint);
    logger.error('Unexpected proxy error', error, { latencyMs });
    const errorBody = JSON.stringify({
      code: 'BAD_GATEWAY',
      message: 'Upstream service unavailable',
      requestId,
      timestamp: new Date().toISOString(),
    });

    return new NextResponse(errorBody, {
      status: 502,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
      },
    });
  }
}
