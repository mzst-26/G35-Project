import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';

describe('sentry frontend helpers', () => {
  const context = { flow: 'test_flow', endpoint: '/api/test', action: 'unit', role: 'admin' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (window as Record<string, unknown>).Sentry;
  });

  describe('captureFrontendError', () => {
    it('calls window.Sentry.captureException with correct tags', () => {
      const captureException = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureException };

      const err = new Error('boom');
      captureFrontendError(err, context);

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(err, {
        tags: {
          flow: 'test_flow',
          endpoint: '/api/test',
          action: 'unit',
          role: 'admin',
        },
      });
    });

    it('defaults optional context fields to "unknown"', () => {
      const captureException = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureException };

      captureFrontendError(new Error('x'), { flow: 'f' });

      expect(captureException).toHaveBeenCalledWith(expect.anything(), {
        tags: {
          flow: 'f',
          endpoint: 'unknown',
          action: 'unknown',
          role: 'unknown',
        },
      });
    });

    it('no-ops when window.Sentry is undefined', () => {
      delete (window as Record<string, unknown>).Sentry;
      expect(() => captureFrontendError(new Error('x'), context)).not.toThrow();
    });

    it('no-ops when captureException method is absent', () => {
      (window as Record<string, unknown>).Sentry = {};
      expect(() => captureFrontendError(new Error('x'), context)).not.toThrow();
    });
  });

  describe('captureFrontendMessage', () => {
    it('calls window.Sentry.captureMessage with correct tags', () => {
      const captureMessage = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureMessage };

      captureFrontendMessage('test message', context);

      expect(captureMessage).toHaveBeenCalledOnce();
      expect(captureMessage).toHaveBeenCalledWith('test message', {
        tags: {
          flow: 'test_flow',
          endpoint: '/api/test',
          action: 'unit',
          role: 'admin',
        },
      });
    });

    it('defaults optional context fields to "unknown"', () => {
      const captureMessage = vi.fn();
      (window as Record<string, unknown>).Sentry = { captureMessage };

      captureFrontendMessage('msg', { flow: 'f' });

      expect(captureMessage).toHaveBeenCalledWith('msg', {
        tags: {
          flow: 'f',
          endpoint: 'unknown',
          action: 'unknown',
          role: 'unknown',
        },
      });
    });

    it('no-ops when window.Sentry is undefined', () => {
      delete (window as Record<string, unknown>).Sentry;
      expect(() => captureFrontendMessage('x', context)).not.toThrow();
    });

    it('no-ops when captureMessage method is absent', () => {
      (window as Record<string, unknown>).Sentry = {};
      expect(() => captureFrontendMessage('x', context)).not.toThrow();
    });
  });
});
