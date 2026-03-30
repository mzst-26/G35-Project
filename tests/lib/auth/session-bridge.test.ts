import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  extractSessionFromRequest,
  validateCsrfForMethod,
  createErrorResponse,
  SessionBridgeError,
} from '@/lib/auth/session-bridge';

describe('lib/auth/session-bridge.ts', () => {
  describe('extractSessionFromRequest', () => {
    it('extracts accessToken and csrfToken from cookies', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        headers: {
          cookie: 'sb-access-token=token-abc; csrf-token=csrf-xyz; other=value',
        },
      });

      const session = await extractSessionFromRequest(request);

      expect(session.accessToken).toBe('token-abc');
      expect(session.csrfToken).toBe('csrf-xyz');
    });

    it('decodes URL-encoded cookie values', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        headers: {
          cookie: 'sb-access-token=token%20with%20space; csrf-token=csrf%2Bspecial',
        },
      });

      const session = await extractSessionFromRequest(request);

      expect(session.accessToken).toContain('token with space');
      expect(session.csrfToken).toContain('csrf+special');
    });

    it('returns null csrfToken when not present', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        headers: {
          cookie: 'sb-access-token=token-abc; other=value',
        },
      });

      const session = await extractSessionFromRequest(request);

      expect(session.accessToken).toBe('token-abc');
      expect(session.csrfToken).toBeNull();
    });

    it('throws 401 when sb-access-token missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        headers: {
          cookie: 'csrf-token=csrf-xyz; other=value',
        },
      });

      await expect(extractSessionFromRequest(request)).rejects.toThrow(SessionBridgeError);
      try {
        await extractSessionFromRequest(request);
      } catch (error) {
        if (error instanceof SessionBridgeError) {
          expect(error.status).toBe(401);
          expect(error.code).toBe('UNAUTHORIZED');
        }
      }
    });

    it('throws 401 when no cookies at all', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        headers: {},
      });

      await expect(extractSessionFromRequest(request)).rejects.toThrow(SessionBridgeError);
    });

    it('throws 401 when sb-access-token is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/core/jobs', {
        headers: {
          cookie: 'sb-access-token=; csrf-token=csrf-xyz',
        },
      });

      await expect(extractSessionFromRequest(request)).rejects.toThrow(SessionBridgeError);
    });
  });

  describe('validateCsrfForMethod', () => {
    describe('GET and HEAD (no CSRF required)', () => {
      it('GET does not require CSRF token', () => {
        expect(() => validateCsrfForMethod('GET', 'cookie-csrf', null)).not.toThrow();
      });

      it('HEAD does not require CSRF token', () => {
        expect(() => validateCsrfForMethod('HEAD', 'cookie-csrf', null)).not.toThrow();
      });
    });

    describe('POST, PUT, PATCH, DELETE (CSRF required)', () => {
      const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      it.each(writeMethods)('%s throws when header CSRF missing', (method) => {
        expect(() => validateCsrfForMethod(method, 'cookie-csrf', null)).toThrow(SessionBridgeError);
      });

      it.each(writeMethods)('%s throws when header CSRF does not match cookie', (method) => {
        expect(() => validateCsrfForMethod(method, 'cookie-csrf-1', 'header-csrf-2')).toThrow(
          SessionBridgeError,
        );
      });

      it.each(writeMethods)('%s throws when cookie CSRF null but header CSRF present', (method) => {
        expect(() => validateCsrfForMethod(method, null, 'header-csrf')).toThrow(SessionBridgeError);
      });

      it.each(writeMethods)('%s passes when tokens match', (method) => {
        expect(() => validateCsrfForMethod(method, 'csrf-token-xyz', 'csrf-token-xyz')).not.toThrow();
      });
    });
  });

  describe('createErrorResponse', () => {
    it('converts SessionBridgeError to JSON response with correct status', () => {
      const error = new SessionBridgeError('Session expired', 401, 'SESSION_EXPIRED');
      const response = createErrorResponse(error, 'req-123');

      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('x-request-id')).toBe('req-123');
    });

    it('includes code, message, requestId, timestamp in error body', async () => {
      const error = new SessionBridgeError('Access denied', 403, 'CSRF_TOKEN_INVALID');
      const response = createErrorResponse(error, 'req-456');
      const body = (await response.json()) as { code: string; message: string; requestId: string; timestamp: string };

      expect(body.code).toBe('CSRF_TOKEN_INVALID');
      expect(body.message).toBe('Access denied');
      expect(body.requestId).toBe('req-456');
      expect(body.timestamp).toBeDefined();
    });

    it('generates requestId if not provided', async () => {
      const error = new SessionBridgeError('Error', 500, 'TEST_ERROR');
      const response = createErrorResponse(error);
      const body = (await response.json()) as { requestId: string };

      expect(body.requestId).toMatch(/^req-/);
    });

    it('normalizes unknown errors to 500 INTERNAL_SERVER_ERROR', async () => {
      const unknownError = new Error('Something broke');
      const response = createErrorResponse(unknownError, 'req-789');

      expect(response.status).toBe(500);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('SessionBridgeError', () => {
    it('creates error with correct properties', () => {
      const error = new SessionBridgeError('Test message', 403, 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.status).toBe(403);
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('SessionBridgeError');
    });
  });
});
