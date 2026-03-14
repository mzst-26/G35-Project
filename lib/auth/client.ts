import { getCsrfToken } from '@/lib/auth/csrf';
import type {
  AuthErrorPayload,
  LogoutPayload,
  MfaChallengeResponse,
  MfaCompleteAdminLoginResponse,
  MfaEnrollResponse,
  MfaVerifyResponse,
  RefreshSessionResponse,
  RequestOtpResponse,
  SessionMeResponse,
  VerifyOtpOutcome,
  VerifyOtpPayload,
} from '@/types/auth';

class AuthApiError extends Error {
  code: string;
  status: number;
  issues?: AuthErrorPayload['issues'];

  constructor(message: string, status: number, code = 'UNKNOWN_ERROR', issues?: AuthErrorPayload['issues']) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  includeCsrf?: boolean;
  retryOnExpired?: boolean;
  signal?: AbortSignal;
};

type ParsedBody<T> = T | AuthErrorPayload | null;

async function parseBody<T>(response: Response): Promise<ParsedBody<T>> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return (await response.json()) as ParsedBody<T>;
}

async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
  hasRetried = false,
): Promise<T> {
  const method = options.method ?? 'GET';
  const headers = new Headers();

  if (method !== 'GET') {
    headers.set('content-type', 'application/json');
  }

  if (options.includeCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  const response = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const body = await parseBody<T>(response);

  if (!response.ok) {
    const errorBody = (body ?? {}) as AuthErrorPayload;

    const shouldRetry =
      !hasRetried &&
      options.retryOnExpired !== false &&
      path !== '/api/auth/session/refresh' &&
      response.status === 401 &&
      errorBody.code === 'TOKEN_EXPIRED';

    if (shouldRetry) {
      try {
        await refreshSession();
        return await requestJson<T>(path, options, true);
      } catch {
        throw new AuthApiError(
          'Your session has expired. Please sign in again.',
          401,
          'TOKEN_EXPIRED',
        );
      }
    }

    throw new AuthApiError(
      errorBody.message ?? 'Authentication request failed.',
      response.status,
      errorBody.code ?? 'UNKNOWN_ERROR',
      errorBody.issues,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (body ?? {}) as T;
}

export async function requestOtp(email: string): Promise<RequestOtpResponse> {
  return requestJson<RequestOtpResponse>('/api/auth/otp/request', {
    method: 'POST',
    body: { email },
    retryOnExpired: false,
  });
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpOutcome> {
  return requestJson<VerifyOtpOutcome>('/api/auth/otp/verify', {
    method: 'POST',
    body: payload,
    retryOnExpired: false,
  });
}

export async function mfaEnroll(): Promise<MfaEnrollResponse> {
  return requestJson<MfaEnrollResponse>('/api/auth/mfa/enroll', {
    method: 'POST',
    body: { type: 'totp', friendlyName: 'Authenticator' },
    includeCsrf: true,
    retryOnExpired: false,
  });
}

export async function mfaChallenge(factorId: string): Promise<MfaChallengeResponse> {
  return requestJson<MfaChallengeResponse>('/api/auth/mfa/challenge', {
    method: 'POST',
    body: { factorId },
    includeCsrf: true,
    retryOnExpired: false,
  });
}

export async function mfaVerify(factorId: string, challengeId: string, code: string): Promise<MfaVerifyResponse> {
  return requestJson<MfaVerifyResponse>('/api/auth/mfa/verify', {
    method: 'POST',
    body: { factorId, challengeId, code },
    includeCsrf: true,
    retryOnExpired: false,
  });
}

export async function mfaCompleteAdminLogin(): Promise<MfaCompleteAdminLoginResponse> {
  return requestJson<MfaCompleteAdminLoginResponse>('/api/auth/mfa/complete-admin-login', {
    method: 'POST',
    includeCsrf: true,
    retryOnExpired: false,
  });
}

export async function getSessionMe(): Promise<SessionMeResponse> {
  return requestJson<SessionMeResponse>('/api/auth/session/me', {
    method: 'GET',
  });
}

export async function refreshSession(): Promise<RefreshSessionResponse> {
  return requestJson<RefreshSessionResponse>('/api/auth/session/refresh', {
    method: 'POST',
    includeCsrf: true,
    retryOnExpired: false,
  });
}

export async function logout(payload: LogoutPayload): Promise<void> {
  await requestJson<void>('/api/auth/session/logout', {
    method: 'POST',
    body: payload,
    includeCsrf: true,
    retryOnExpired: false,
  });
}

export { AuthApiError };
