import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, redactSensitive } from '@/lib/utils/logger';

describe('lib/utils/logger.ts', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('redactSensitive', () => {
    it('redacts authorization header', () => {
      const result = redactSensitive({ authorization: 'Bearer token123' });
      expect(result).toEqual({ authorization: '[REDACTED]' });
    });

    it('redacts nested sensitive fields', () => {
      const result = redactSensitive({
        user: { password: 'secret', email: 'user@example.com' },
      });
      expect(result).toEqual({
        user: { password: '[REDACTED]', email: 'user@example.com' },
      });
    });

    it('preserves non-sensitive fields', () => {
      const result = redactSensitive({
        route: '/api/jobs',
        status: 200,
      });
      expect(result).toEqual({
        route: '/api/jobs',
        status: 200,
      });
    });

    it('handles arrays', () => {
      const result = redactSensitive([
        { token: 'secret' },
        { token: 'secret2' },
      ]);
      expect(result).toEqual([
        { token: '[REDACTED]' },
        { token: '[REDACTED]' },
      ]);
    });

    it('returns primitives unchanged', () => {
      expect(redactSensitive('string')).toBe('string');
      expect(redactSensitive(123)).toBe(123);
      expect(redactSensitive(null)).toBe(null);
    });
  });

  describe('Logger', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger();
    });

    it('formats and logs info message', () => {
      logger.info('Test message', { extra: 'data' });

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('info');
      expect(logged.message).toBe('Test message');
      expect(logged.context).toEqual({ extra: 'data' });
    });

    it('includes requestId and userId in entry', () => {
      logger.setContext({ requestId: 'req-123', userId: 'user-456' });
      logger.info('Test');

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logged.requestId).toBe('req-123');
      expect(logged.userId).toBe('user-456');
    });

    it('logs warning', () => {
      logger.warn('Warning message', { code: 'WARN_CODE' });

      const logged = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('warn');
      expect(logged.message).toBe('Warning message');
    });

    it('logs error and redacts sensitive info', () => {
      const error = new Error('Auth failed');
      logger.error('Error occurred', error, { userId: 'user123' });

      const logged = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('error');
      expect(logged.message).toBe('Error occurred');
      expect(logged.context.error).toBeDefined();
      expect(logged.context.userId).toBe('user123');
    });

    it('includes timestamp in structured log', () => {
      logger.info('Test');

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logged.timestamp).toBeDefined();
      expect(new Date(logged.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
