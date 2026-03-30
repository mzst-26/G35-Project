import '@testing-library/jest-dom/vitest';

const env = process.env as Record<string, string | undefined>;

env.NODE_ENV ??= 'test';
env.IDENTITY_SERVICE_URL ??= 'http://localhost:3001';
env.CORE_PLATFORM_SERVICE_URL ??= 'http://localhost:3002';
env.CORE_PLATFORM_PROXY_TIMEOUT_MS ??= '10000';
