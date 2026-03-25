import { NextRequest, NextResponse } from 'next/server';
import { getServerEnvConfig } from '@/lib/auth/env-validation';

const ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface CoreProxyOptions {
  endpoint: string;
  method?: string;
}

interface CoreProxyResponse {
  status: number;
  body: string;
  contentType: string | null;
}

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
  const cookies = request.headers.get('cookie') || '';
  const tokenMatch = cookies.match(/sb-access-token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
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

  const xRequestId = request.headers.get('x-request-id');
  if (xRequestId) {
    headers.set('x-request-id', xRequestId);
  }

  // Add Bearer token for authentication
  headers.set('authorization', `Bearer ${bearerToken}`);

  return headers;
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
      console.error('[core proxy] upstream 5xx', {
        endpoint: new URL(targetUrl).pathname,
        status: response.status,
        bodySize: responseText.length,
      });
    }

    const contentType = response.headers.get('content-type');
    return {
      status: response.status,
      body: responseText,
      contentType,
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
  const requestId = request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`;

  try {
    // Validate environment
    const config = getServerEnvConfig();

    // Validate method
    const method = options.method || request.method;
    if (!ALLOWED_METHODS.includes(method)) {
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
    const headers = buildCoreHeaders(request, bearerToken);

    // Proxy request with timeout
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
    const proxyResponse = await getCoreProxyResponse(
      targetUrl,
      method,
      headers,
      body,
      config.corePlatformProxyTimeoutMs,
    );

    // Build Next response
    const nextResponse = new NextResponse(proxyResponse.body, {
      status: proxyResponse.status,
    });

    if (proxyResponse.contentType) {
      nextResponse.headers.set('content-type', proxyResponse.contentType);
    }

    nextResponse.headers.set('x-request-id', requestId);
    return nextResponse;
  } catch (error) {
    if (error instanceof CoreProxyError) {
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
    console.error('[core proxy] unexpected error', { requestId, error });
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
