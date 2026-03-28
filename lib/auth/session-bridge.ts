import { NextRequest, NextResponse } from 'next/server';

interface ErrorEnvelope {
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
}

function getOrCreateRequestId(request: NextRequest): string {
  const requestId = request.headers.get('x-request-id');
  if (requestId) {
    return requestId;
  }
  return `req-${crypto.randomUUID()}`;
}

function jsonError(status: number, requestId: string): NextResponse {
  const body: ErrorEnvelope = {
    code: 'SESSION_BRIDGE_ERROR',
    message: 'Failed to process session bridge request',
    requestId,
    timestamp: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
  });
}

export async function withSessionBridge(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(request);

  try {
    const response = await handler();
    if (!response.headers.get('x-request-id')) {
      response.headers.set('x-request-id', requestId);
    }
    return response;
  } catch {
    return jsonError(502, requestId);
  }
}
