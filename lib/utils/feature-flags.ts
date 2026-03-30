// Feature flag system for managing proxy rollout stages
// Each route can be independently controlled via environment

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export type ProxyStage = 'disabled' | 'read-only' | 'with-writes' | 'fully-enabled';

export interface FeatureFlagConfig {
  // Route groups that can be independently controlled
  jobs: ProxyStage;
  calendar: ProxyStage;
  companies: ProxyStage;
  workers: ProxyStage;
  admin: ProxyStage;
  // Global override
  enableAllRoutes?: boolean;
}

// Parse from env: PROXY_FLAGS_JOBS=with-writes,PROXY_FLAGS_COMPANIES=read-only
function parseEnvFlags(): Partial<FeatureFlagConfig> {
  const flags: Record<string, ProxyStage> = {};

  const domains = ['jobs', 'calendar', 'companies', 'workers', 'admin'];
  for (const domain of domains) {
    const envKey = `PROXY_FLAGS_${domain.toUpperCase()}`;
    const value = process.env[envKey];
    if (value && ['disabled', 'read-only', 'with-writes', 'fully-enabled'].includes(value)) {
      flags[domain] = value as ProxyStage;
    }
  }

  return flags;
}

// Default: start with all disabled, enable via env
const defaultConfig: FeatureFlagConfig = {
  jobs: (process.env.PROXY_FLAGS_JOBS as ProxyStage) || 'disabled',
  calendar: (process.env.PROXY_FLAGS_CALENDAR as ProxyStage) || 'disabled',
  companies: (process.env.PROXY_FLAGS_COMPANIES as ProxyStage) || 'disabled',
  workers: (process.env.PROXY_FLAGS_WORKERS as ProxyStage) || 'disabled',
  admin: (process.env.PROXY_FLAGS_ADMIN as ProxyStage) || 'disabled',
  enableAllRoutes: process.env.PROXY_DISABLE_ALL_MOCKS === 'true', // Emergency override
};

const envConfig = parseEnvFlags();

export class FeatureFlags {
  private config: FeatureFlagConfig;

  constructor(config?: Partial<FeatureFlagConfig>) {
    this.config = { ...defaultConfig, ...envConfig, ...config };
  }

  isProxyEnabled(domain: keyof FeatureFlagConfig, method: string): boolean {
    if (this.config.enableAllRoutes) return true;

    const stage = this.config[domain];

    return (
      (stage === 'read-only' && method === 'GET') ||
      (stage === 'with-writes' && ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) ||
      stage === 'fully-enabled'
    );
  }

  canRead(domain: keyof FeatureFlagConfig): boolean {
    const stage = this.config[domain];
    return stage !== 'disabled';
  }

  canWrite(domain: keyof FeatureFlagConfig): boolean {
    const stage = this.config[domain];
    return stage === 'with-writes' || stage === 'fully-enabled';
  }

  getStatus(): {
    domain: string;
    stage: ProxyStage;
    canRead: boolean;
    canWrite: boolean;
  }[] {
    const domains = ['jobs', 'calendar', 'companies', 'workers', 'admin'] as const;
    return domains.map((domain) => ({
      domain,
      stage: (this.config[domain] || 'disabled') as ProxyStage,
      canRead: this.canRead(domain),
      canWrite: this.canWrite(domain),
    }));
  }
}

export const featureFlags = new FeatureFlags();

// Return fallback error if proxy not enabled for this domain/method
export function getProxyDisabledResponse(domain: string, method: string): NextResponse | null {
  const flags = featureFlags;
  const domainKey = domain as keyof FeatureFlagConfig;

  if (!flags.isProxyEnabled(domainKey, method)) {
    return new NextResponse(
      JSON.stringify({
        code: 'PROXY_DISABLED',
        message: `Proxy route for '${domain}' ${method === 'GET' ? 'reading' : 'writing'} is not yet enabled. Please use the legacy endpoint.`,
        requestId: `req-${randomUUID()}`,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503, // Service Unavailable for graceful degradation
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  return null;
}
