import type { ApiErrorEnvelope } from '@/types/core-dto-contracts';

export interface HookErrorEnvelope extends ApiErrorEnvelope {
  status: number;
}

export class HookApiError extends Error {
  readonly envelope: HookErrorEnvelope;

  constructor(envelope: HookErrorEnvelope) {
    super(envelope.message);
    this.name = 'HookApiError';
    this.envelope = envelope;
  }
}

function makeRequestId(): string {
  return `req-${crypto.randomUUID()}`;
}

function getResponseRequestId(response: Response): string | null {
  const requestId = response.headers.get('x-request-id');
  return requestId && requestId.trim().length > 0 ? requestId : null;
}

function makeTimestamp(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEnvelope(body: unknown, fallback: HookErrorEnvelope): HookErrorEnvelope {
  if (!isRecord(body)) {
    return fallback;
  }

  return {
    code: typeof body.code === 'string' ? body.code : fallback.code,
    message: typeof body.message === 'string' ? body.message : fallback.message,
    requestId: typeof body.requestId === 'string' ? body.requestId : fallback.requestId,
    timestamp: typeof body.timestamp === 'string' ? body.timestamp : fallback.timestamp,
    status: typeof body.status === 'number' ? body.status : fallback.status,
    issues: Array.isArray(body.issues)
      ? body.issues.filter((issue): issue is { field: string; message: string } => {
          return (
            isRecord(issue) &&
            typeof issue.field === 'string' &&
            typeof issue.message === 'string'
          );
        })
      : undefined,
  };
}

async function parseJsonSafely(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function parseJsonOrThrowEnvelope<T>(
  response: Response,
  fallbackMessage: string,
  fallbackCode: string,
): Promise<T> {
  const body = await parseJsonSafely(response);

  if (!response.ok) {
    const responseRequestId = getResponseRequestId(response);
    const fallback: HookErrorEnvelope = {
      code: fallbackCode,
      message: fallbackMessage,
      requestId: responseRequestId ?? makeRequestId(),
      timestamp: makeTimestamp(),
      status: response.status,
    };

    throw new HookApiError(parseEnvelope(body, fallback));
  }

  return (body ?? {}) as T;
}

export function toHookApiError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode: string,
  fallbackStatus = 500,
): HookApiError {
  if (error instanceof HookApiError) {
    return error;
  }

  if (isRecord(error) && isRecord(error.envelope)) {
    const fallback: HookErrorEnvelope = {
      code: fallbackCode,
      message: fallbackMessage,
      requestId: makeRequestId(),
      timestamp: makeTimestamp(),
      status: fallbackStatus,
    };
    return new HookApiError(parseEnvelope(error.envelope, fallback));
  }

  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  return new HookApiError({
    code: fallbackCode,
    message,
    requestId: makeRequestId(),
    timestamp: makeTimestamp(),
    status: fallbackStatus,
  });
}
