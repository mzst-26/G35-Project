// Server-side environment validation for proxy layer.
// Runs at route handler startup to fail fast on misconfiguration.

const REQUIRED_SERVER_ENVS = [
  'IDENTITY_SERVICE_URL',
  'CORE_PLATFORM_SERVICE_URL',
];

const OPTIONAL_SERVER_ENVS = [
  'CORE_PLATFORM_PROXY_TIMEOUT_MS',
];

export interface ServerEnvConfig {
  identityServiceUrl: string;
  corePlatformServiceUrl: string;
  corePlatformProxyTimeoutMs: number;
}

export class EnvValidationError extends Error {
  constructor(missingVars: string[]) {
    const list = missingVars.join(', ');
    super(`Missing required server environment variables: ${list}`);
    this.name = 'EnvValidationError';
  }
}

export function getServerEnvConfig(): ServerEnvConfig {
  const missing = REQUIRED_SERVER_ENVS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }

  return {
    identityServiceUrl: process.env.IDENTITY_SERVICE_URL as string,
    corePlatformServiceUrl: process.env.CORE_PLATFORM_SERVICE_URL as string,
    corePlatformProxyTimeoutMs:
      parseInt(process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS ?? '10000', 10) || 10000,
  };
}

export function validateServerEnv(): void {
  try {
    getServerEnvConfig();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`❌ ${error.message}`);
      console.error('Ensure all variables are set in .env.local or deployment config.');
      throw error;
    }
    throw error;
  }
}
