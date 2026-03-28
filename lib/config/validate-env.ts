// Validate required server-side environment variables on startup
// Runs only on Next.js server, never on browser or build time

import { logger } from '@/lib/utils/logger';

interface ValidatedEnv {
  IDENTITY_SERVICE_URL: string;
  CORE_PLATFORM_SERVICE_URL: string;
  CORE_PLATFORM_PROXY_TIMEOUT_MS: number;
}

let cached: ValidatedEnv | null = null;

export function getValidatedEnv(): ValidatedEnv {
  if (cached) return cached;

  const env: Partial<ValidatedEnv> = {
    IDENTITY_SERVICE_URL: process.env.IDENTITY_SERVICE_URL,
    CORE_PLATFORM_SERVICE_URL: process.env.CORE_PLATFORM_SERVICE_URL,
  };

  const timeoutStr = process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS || '10000';
  const timeout = parseInt(timeoutStr, 10);

  // Validation
  const errors: string[] = [];

  if (!env.IDENTITY_SERVICE_URL?.trim()) {
    errors.push('IDENTITY_SERVICE_URL is required but not set');
  }

  if (!env.CORE_PLATFORM_SERVICE_URL?.trim()) {
    errors.push('CORE_PLATFORM_SERVICE_URL is required but not set');
  }

  if (Number.isNaN(timeout) || timeout < 100 || timeout > 60000) {
    errors.push(
      `CORE_PLATFORM_PROXY_TIMEOUT_MS must be a number between 100-60000ms, got: ${timeoutStr}`,
    );
  }

  // Validate URLs are absolute
  if (env.IDENTITY_SERVICE_URL) {
    try {
      new URL(env.IDENTITY_SERVICE_URL);
    } catch {
      errors.push(`IDENTITY_SERVICE_URL is not a valid URL: ${env.IDENTITY_SERVICE_URL}`);
    }
  }

  if (env.CORE_PLATFORM_SERVICE_URL) {
    try {
      new URL(env.CORE_PLATFORM_SERVICE_URL);
    } catch {
      errors.push(
        `CORE_PLATFORM_SERVICE_URL is not a valid URL: ${env.CORE_PLATFORM_SERVICE_URL}`,
      );
    }
  }

  if (errors.length > 0) {
    const message = `Invalid server environment configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    logger.error(message);
    throw new Error(message);
  }

  cached = {
    IDENTITY_SERVICE_URL: env.IDENTITY_SERVICE_URL!,
    CORE_PLATFORM_SERVICE_URL: env.CORE_PLATFORM_SERVICE_URL!,
    CORE_PLATFORM_PROXY_TIMEOUT_MS: timeout,
  };

  return cached;
}
