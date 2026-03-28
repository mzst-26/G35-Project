import { parseJsonOrThrowEnvelope } from '@/lib/core/error-envelope';

export type QueryValue = string | number | boolean | null | undefined;

interface CoreRequestOptions {
  fallbackMessage: string;
  fallbackCode: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
}

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }

  const queryString = params.toString();
  if (!queryString) {
    return path;
  }

  return `${path}?${queryString}`;
}

export async function coreRequestJson<T>(path: string, options: CoreRequestOptions): Promise<T> {
  const url = withQuery(path, options.query);
  const method = options.method ?? 'GET';
  const hasJsonBody = options.body !== undefined;

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: hasJsonBody ? { 'content-type': 'application/json' } : undefined,
    body: hasJsonBody ? JSON.stringify(options.body) : undefined,
  });

  return parseJsonOrThrowEnvelope<T>(
    response,
    options.fallbackMessage,
    options.fallbackCode,
  );
}

export async function coreGetJson<T>(
  path: string,
  fallbackMessage: string,
  fallbackCode: string,
  query?: Record<string, QueryValue>,
): Promise<T> {
  return coreRequestJson<T>(path, {
    fallbackMessage,
    fallbackCode,
    method: 'GET',
    query,
  });
}

export async function corePatchJson<TResponse, TBody>(
  path: string,
  body: TBody,
  fallbackMessage: string,
  fallbackCode: string,
): Promise<TResponse> {
  return coreRequestJson<TResponse>(path, {
    fallbackMessage,
    fallbackCode,
    method: 'PATCH',
    body,
  });
}
