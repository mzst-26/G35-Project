const REQUIRED_SERVER_ENVS = ['IDENTITY_SERVICE_URL'] as const;
const DEFAULT_LOCAL_CORE_PLATFORM_SERVICE_URL = 'http://localhost:3001';

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
  const missing: string[] = REQUIRED_SERVER_ENVS.filter((key) => !process.env[key]);

  const corePlatformServiceUrl =
    process.env.CORE_PLATFORM_SERVICE_URL ||
    (process.env.NODE_ENV === 'production' ? undefined : DEFAULT_LOCAL_CORE_PLATFORM_SERVICE_URL);

  if (!corePlatformServiceUrl) {
    missing.push('CORE_PLATFORM_SERVICE_URL');
  }

  if (missing.length > 0) {
    throw new EnvValidationError([...missing]);
  }

  return {
    identityServiceUrl: process.env.IDENTITY_SERVICE_URL as string,
    corePlatformServiceUrl: corePlatformServiceUrl as string,
    corePlatformProxyTimeoutMs:
      Number.parseInt(process.env.CORE_PLATFORM_PROXY_TIMEOUT_MS ?? '10000', 10) || 10000,
  };
}

export function validateServerEnv(): void {
  try {
    getServerEnvConfig();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`❌ ${error.message}`);
      console.error('Ensure all variables are set in .env.local or deployment config.');
    }
    throw error;
  }
}
