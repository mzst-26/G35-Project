import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getValidatedEnv } from '@/lib/config/validate-env';

describe('getValidatedEnv', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    vi.resetModules(); // Clear cache
  });

  afterEach(() => {
    process.env = original;
  });

  it('returns validated env when all required vars set', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://localhost:3001';
    process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4200';
    process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS = '5000';

    const env = getValidatedEnv();

    expect(env.IDENTITY_SERVICE_URL).toBe('http://localhost:3001');
    expect(env.CORE_PLATFORM_SERVICE_URL).toBe('http://localhost:4200');
    expect(env.CORE_PLATFORM_PROXY_TIMEOUT_MS).toBe(5000);
  });

  it('throws when IDENTITY_SERVICE_URL missing', () => {
    process.env.IDENTITY_SERVICE_URL = '';
    process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4200';

    expect(() => getValidatedEnv()).toThrow('IDENTITY_SERVICE_URL is required');
  });

  it('throws when CORE_PLATFORM_SERVICE_URL missing', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://localhost:3001';
    process.env.CORE_PLATFORM_SERVICE_URL = '';

    expect(() => getValidatedEnv()).toThrow('CORE_PLATFORM_SERVICE_URL is required');
  });

  it('throws when timeout is invalid', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://localhost:3001';
    process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4200';
    process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS = 'not-a-number';

    expect(() => getValidatedEnv()).toThrow('must be a number');
  });

  it('throws when timeout below minimum', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://localhost:3001';
    process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4200';
    process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS = '50';

    expect(() => getValidatedEnv()).toThrow('between 100-60000ms');
  });

  it('throws when URL is invalid', () => {
    process.env.IDENTITY_SERVICE_URL = 'not a url';
    process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4200';

    expect(() => getValidatedEnv()).toThrow('not a valid URL');
  });

  it('uses default timeout when not specified', () => {
    process.env.IDENTITY_SERVICE_URL = 'http://localhost:3001';
    process.env.CORE_PLATFORM_SERVICE_URL = 'http://localhost:4200';
    delete process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS;

    const env = getValidatedEnv();

    expect(env.CORE_PLATFORM_PROXY_TIMEOUT_MS).toBe(10000);
  });
});
