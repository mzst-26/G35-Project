import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getServerEnvConfig,
  validateServerEnv,
  EnvValidationError,
} from '@/lib/auth/env-validation';

describe('lib/auth/env-validation.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getServerEnvConfig()', () => {
    it('returns config when all required vars are set', () => {
      process.env.IDENTITY_SERVICE_URL = 'http://localhost:4001';
      process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4002';
      process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS = '5000';

      const config = getServerEnvConfig();

      expect(config).toEqual({
        identityServiceUrl: 'http://localhost:4001',
        corePlatformServiceUrl: 'http://localhost:4002',
        corePlatformProxyTimeoutMs: 5000,
      });
    });

    it('uses default timeout when CORE_PLATFORM_PROXY_TIMEOUT_MS is missing', () => {
      process.env.IDENTITY_SERVICE_URL = 'http://localhost:4001';
      process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4002';
      delete process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS;

      const config = getServerEnvConfig();

      expect(config.corePlatformProxyTimeoutMs).toBe(10000);
    });

    it('throws EnvValidationError when IDENTITY_SERVICE_URL missing', () => {
      delete process.env.IDENTITY_SERVICE_URL;
      process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4002';

      expect(() => getServerEnvConfig()).toThrow(EnvValidationError);
      expect(() => getServerEnvConfig()).toThrow('Missing required server environment variables');
    });

    it('throws EnvValidationError when CORE_PLATFORM_SERVICE_URL missing', () => {
      process.env.IDENTITY_SERVICE_URL = 'http://localhost:4001';
      delete process.env.CORE_PLATFORM_SERVICE_URL;

      expect(() => getServerEnvConfig()).toThrow(EnvValidationError);
      expect(() => getServerEnvConfig()).toThrow('Missing required server environment variables');
    });

    it('throws EnvValidationError when both required vars missing', () => {
      delete process.env.IDENTITY_SERVICE_URL;
      delete process.env.CORE_PLATFORM_SERVICE_URL;

      expect(() => getServerEnvConfig()).toThrow(EnvValidationError);
    });
  });

  describe('validateServerEnv()', () => {
    it('does not throw when all required vars set', () => {
      process.env.IDENTITY_SERVICE_URL = 'http://localhost:4001';
      process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4002';

      expect(() => validateServerEnv()).not.toThrow();
    });

    it('throws EnvValidationError when required var missing', () => {
      process.env.IDENTITY_SERVICE_URL = 'http://localhost:4001';
      delete process.env.CORE_PLATFORM_SERVICE_URL;

      expect(() => validateServerEnv()).toThrow(EnvValidationError);
    });
  });

  describe('EnvValidationError', () => {
    it('constructs error message with missing var list', () => {
      const error = new EnvValidationError(['VAR_A', 'VAR_B']);

      expect(error.name).toBe('EnvValidationError');
      expect(error.message).toContain('VAR_A, VAR_B');
    });
  });
});
