/**
 * Rollout Plan: 6 Stages for Proxy Migration
 * 
 * Each stage is gated by feature flags and requires explicit approval before advancing.
 * Domain-by-domain control allows independent rollback per service.
 */

export interface RolloutStage {
  stage: number;
  name: string;
  description: string;
  domainsEnabled: string[];
  features: string[];
  readinessChecks: string[];
  successCriteria: string[];
  estimatedDuration: string;
}

export const ROLLOUT_STAGES: RolloutStage[] = [
  {
    stage: 0,
    name: 'Setup & Infrastructure',
    description: 'Deploy proxy utilities, feature flags, observability, and circuit breakers.',
    domainsEnabled: [],
    features: [
      'Core proxy utility (lib/core/proxy.ts)',
      'Feature flags system (lib/utils/feature-flags.ts)',
      'Logger with PII redaction (lib/utils/logger.ts)',
      'Circuit breaker (lib/utils/circuit-breaker.ts)',
      'SLO configuration (lib/utils/slo-config.ts)',
      'Rate throttling (lib/utils/throttle.ts)',
      'Security headers (lib/utils/security-headers.ts)',
    ],
    readinessChecks: [
      'All utility tests passing',
      'Build succeeds (no TypeScript errors)',
      'Feature flags configurable via env',
      'Logger emits structured JSON logs',
      'Circuit breaker state transitions work',
    ],
    successCriteria: [
      'Infrastructure deployed to dev',
      'Zero production impact (all feature flags disabled)',
      'Observability baseline established',
      'Team trained on SLO and alert policies',
    ],
    estimatedDuration: '1-2 days',
  },
  {
    stage: 1,
    name: 'Read-Only Routes (Dev)',
    description: 'Enable GET-only proxy routes in development. No writes yet.',
    domainsEnabled: ['jobs', 'companies', 'workers'],
    features: [
      'GET routes proxy to core-platform',
      'Add app/api/core/jobs/route.ts (GET only)',
      'Add app/api/core/companies/[id]/route.ts (GET only)',
      'Add app/api/core/workers/route.ts (GET only)',
      'Auth validation in session-bridge',
      'Structured logging + metrics',
    ],
    readinessChecks: [
      'Routes respond with 200 for valid requests',
      'Routes return 401 for invalid/missing tokens',
      'Logs contain route, upstream, status, latencyMs, requestId',
      'Metrics baseline: success rate, latency percentiles',
      'No cross-domain bleeding',
    ],
    successCriteria: [
      'Dev environment passes integration tests',
      'P95 latency < 500ms for typical jobs/company reads',
      'Success rate > 99%',
      'Team comfortable with logs and metrics',
      'Approved by frontend + backend leads',
    ],
    estimatedDuration: '2-3 days',
  },
  {
    stage: 2,
    name: 'Write Routes (Dev)',
    description: 'Enable POST/PATCH/DELETE routes in dev. Add role validation and CSRF checks.',
    domainsEnabled: ['jobs', 'companies', 'workers'],
    features: [
      'POST/PATCH/DELETE routes in dev',
      'Role-based early checks (company can edit company, worker can edit worker)',
      'CSRF validation on all write routes',
      'Origin/Referer checks for browser requests',
      'Error normalization to prevent info leaks',
    ],
    readinessChecks: [
      'POST /api/core/jobs returns 403 for non-company users',
      'PATCH /api/core/jobs fails with missing CSRF token',
      'CSRF token validation works end-to-end',
      'Unauthorized writes blocked with 403 (not 500)',
      'Error responses never leak token/credentials',
    ],
    successCriteria: [
      'Write path security tests all pass',
      'Role checks working correctly',
      'CSRF validation preventing forgery',
      'E2E test: login → read → write → verify success',
      'Approved by security + backend leads',
    ],
    estimatedDuration: '2-3 days',
  },
  {
    stage: 3,
    name: 'Staging Rollout (Single Domain)',
    description: 'Enable jobs domain in staging. Monitor SLOs for 24-48 hours before expanding.',
    domainsEnabled: ['jobs'],
    features: [
      'Enable PROXY_FLAGS_JOBS=with-writes in staging',
      'All observability dashboards live',
      'Alert policies active for jobs domain',
      'Circuit breaker monitoring upstream health',
    ],
    readinessChecks: [
      'Staging database seeded with realistic data',
      'Load testing: proxy latency acceptable under 100 req/s',
      'Failover tested: if core goes down, proxy circuit opens',
      'Rollback plan documented and tested',
    ],
    successCriteria: [
      'Jobs proxy success rate > 99.5% for 24 hours',
      'P95 latency < 500ms',
      'No upstream errors caused by proxy',
      'Team on-call and monitoring dashboards',
      'Zero production complaints',
      'Approved by ops + backend leads',
    ],
    estimatedDuration: '2-3 days (24-48h observation)',
  },
  {
    stage: 4,
    name: 'Expand to All Domains (Staging)',
    description: 'Roll out remaining domains (calendar, companies, workers, admin) to staging.',
    domainsEnabled: ['jobs', 'calendar', 'companies', 'workers', 'admin'],
    features: [
      'Enable all domains in staging',
      'Admin route security hardening',
      'Calendar-specific rate limiting',
      'Admin-only observability dashboards',
    ],
    readinessChecks: [
      'Admin routes have stricter SLO (99.99%)',
      'Calendar routes handle high volume',
      'All domains tested with expected load patterns',
    ],
    successCriteria: [
      'All 5 domains > 99% success rate for 24 hours',
      'No cross-domain failures',
      'Alert fatigue < 2 alerts/day',
      'Approved by full platform team',
    ],
    estimatedDuration: '2-3 days',
  },
  {
    stage: 5,
    name: 'Production Rollout with Canary',
    description: 'Gradual rollout to production with canary toggle and circuit breaker kill switch.',
    domainsEnabled: ['jobs', 'calendar', 'companies', 'workers', 'admin'],
    features: [
      'Canary: 10% traffic to proxy, 90% to mockservices',
      'Circuit breaker: auto-fallback if > 2% error rate',
      'Kill switch: PROXY_DISABLE_ALL_MOCKS=false (instant fallback)',
      'Full observability in production',
    ],
    readinessChecks: [
      'Production canary test: 1% traffic for 1 hour',
      'Fallback path tested (mockservices still running)',
      'Oncall understands runbooks',
      'Rollback procedure rehearsed',
    ],
    successCriteria: [
      'Canary 10%: success rate > 99%',
      'No production customer complaints',
      'All SLOs maintained',
      'Expand to 50% after 4 hours',
      'Expand to 100% after 4 more hours',
      'Monitor for 24 hours with dedicated oncall',
    ],
    estimatedDuration: '1-2 days (24h monitoring)',
  },
];

/**
 * Per-route migration tracker
 * Updated as each route is migrated and tested
 */
export interface RouteStatus {
  route: string;
  domain: string;
  method: string;
  mockService: string;
  status: 'not-started' | 'in-progress' | 'ready-for-staging' | 'staged' | 'production';
  stageReachedAt?: string;
  notes?: string;
}

export const ROUTE_MIGRATION_STATUS: RouteStatus[] = [
  // Jobs domain (Stage 3 → Production)
  {
    route: 'GET /api/core/jobs',
    domain: 'jobs',
    method: 'GET',
    mockService: 'listRecentCompanyJobs (useCompanyJobs)',
    status: 'not-started',
  },
  {
    route: 'GET /api/core/jobs/:id',
    domain: 'jobs',
    method: 'GET',
    mockService: 'getCompanyJobDetail (useCompanyJobDetails)',
    status: 'not-started',
  },
  {
    route: 'POST /api/core/jobs',
    domain: 'jobs',
    method: 'POST',
    mockService: 'N/A (no mock, new core capability)',
    status: 'not-started',
  },
  {
    route: 'PATCH /api/core/jobs/:id',
    domain: 'jobs',
    method: 'PATCH',
    mockService: 'N/A (no mock)',
    status: 'not-started',
  },

  // Calendar domain (Stage 4)
  {
    route: 'GET /api/core/calendar/...',
    domain: 'calendar',
    method: 'GET',
    mockService: 'TBD (not yet implemented)',
    status: 'not-started',
  },

  // Companies domain (Stage 4)
  {
    route: 'GET /api/core/companies',
    domain: 'companies',
    method: 'GET',
    mockService: 'N/A (local data)',
    status: 'not-started',
  },
  {
    route: 'PATCH /api/core/companies/:id',
    domain: 'companies',
    method: 'PATCH',
    mockService: 'N/A (no mock)',
    status: 'not-started',
  },

  // Workers domain (Stage 4)
  {
    route: 'GET /api/core/workers',
    domain: 'workers',
    method: 'GET',
    mockService: 'getTradePenalties (useTradePenalties)',
    status: 'not-started',
  },

  // Admin domain (Stage 4 → Production)
  {
    route: 'POST /api/core/admin/workers/:id/verification',
    domain: 'admin',
    method: 'POST',
    mockService: 'N/A (admin-only)',
    status: 'not-started',
  },
];
