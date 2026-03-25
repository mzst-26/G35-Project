// Service Level Objectives and alerting thresholds
// Targets and alert conditions for proxy health monitoring

export interface SloTarget {
  name: string;
  description: string;
  target: number; // % or ms
  alertThreshold: number; // % or ms (triggers alert when exceeded)
}

export interface AlertPolicy {
  name: string;
  metric: string;
  condition: 'above' | 'below';
  threshold: number;
  evaluationWindowMs: number; // How long to evaluate (e.g., 5 minutes)
  alertSeverity: 'warning' | 'critical';
  actions: string[]; // e.g., ['page-oncall', 'slack-channel', 'create-ticket']
}

// Core SLO targets (published to users)
export const SLO_TARGETS: Record<string, SloTarget> = {
  proxySuccessRate: {
    name: 'Proxy Success Rate',
    description: 'Upstream proxy response (not counting local validation failures)',
    target: 99.5, // 99.5%
    alertThreshold: 98, // Alert if below 98%
  },
  proxyP95Latency: {
    name: 'Proxy P95 Latency (Critical Routes)',
    description: 'P95 latency for critical read/write paths',
    target: 500, // ms
    alertThreshold: 1000, // Alert if p95 > 1s
  },
  proxyP99Latency: {
    name: 'Proxy P99 Latency',
    description: 'P99 latency for any proxy route',
    target: 2000, // ms
    alertThreshold: 5000, // Alert if p99 > 5s
  },
  upstreamTimeoutRate: {
    name: 'Upstream Timeout Rate',
    description: 'Requests timing out waiting for core-platform',
    target: 0.1, // 0.1%
    alertThreshold: 1, // Alert if > 1%
  },
  authFailureRate: {
    name: 'Auth Failure Rate',
    description: 'Proxy requests failing due to auth issues',
    target: 0.05, // 0.05%
    alertThreshold: 0.5, // Alert if > 0.5%
  },
};

// Alert policies (when to escalate)
export const ALERT_POLICIES: AlertPolicy[] = [
  {
    name: 'High Proxy Error Rate',
    metric: 'proxy_requests_5xx_total / proxy_requests_total',
    condition: 'above',
    threshold: 2, // > 2%
    evaluationWindowMs: 5 * 60 * 1000, // 5 minutes
    alertSeverity: 'critical',
    actions: ['page-oncall', 'slack-engineering', 'create-pagerduty-incident'],
  },
  {
    name: 'High Upstream Timeout Rate',
    metric: 'proxy_requests_timeout_total / proxy_requests_total',
    condition: 'above',
    threshold: 1, // > 1%
    evaluationWindowMs: 3 * 60 * 1000, // 3 minutes
    alertSeverity: 'warning',
    actions: ['slack-engineering'],
  },
  {
    name: 'Auth Spike (Suspicious Activity)',
    metric: 'proxy_auth_failures_total',
    condition: 'above',
    threshold: 100, // > 100 in window
    evaluationWindowMs: 1 * 60 * 1000, // 1 minute
    alertSeverity: 'warning',
    actions: ['slack-security'],
  },
  {
    name: 'High Latency (P95 > 2s)',
    metric: 'histogram_quantile(0.95, proxy_latency_ms)',
    condition: 'above',
    threshold: 2000, // > 2s
    evaluationWindowMs: 10 * 60 * 1000, // 10 minutes (allow spikes)
    alertSeverity: 'warning',
    actions: ['slack-engineering'],
  },
  {
    name: 'Circuit Breaker Open',
    metric: 'circuit_breaker_state{name="core_upstream"}',
    condition: 'above',
    threshold: 0, // state = 1 means open
    evaluationWindowMs: 30 * 1000, // 30 seconds (react quickly)
    alertSeverity: 'critical',
    actions: ['page-oncall', 'slack-engineering'],
  },
];

// Capacity control parameters
export interface CapacityControl {
  maxConcurrentUpstreamRequests: number; // Max concurrent calls to core-platform
  maxRequestsPerSecond: number; // Global throttle
  maxRequestBodySizeBytes: number; // Body size limit
  circuitBreakerFailureThreshold: number; // % failure rate to trip breaker
}

export const CAPACITY_CONTROLS: CapacityControl = {
  maxConcurrentUpstreamRequests: 500, // Protect core from overwhelming
  maxRequestsPerSecond: 2000, // Global rate (adjust based on core capacity)
  maxRequestBodySizeBytes: 10 * 1024 * 1024, // 10 MB
  circuitBreakerFailureThreshold: 50, // Open if > 50% fail
};

// Domain-specific headroom (for staged rollout monitoring)
export const DOMAIN_SLO_ADJUSTMENTS: Record<string, Partial<SloTarget>> = {
  jobs: {
    // Jobs are critical; stricter SLO
    target: 99.9,
    alertThreshold: 99.0,
  },
  calendar: {
    // Calendar is less critical; softer SLO initially
    target: 99.0,
    alertThreshold: 97.0,
  },
  companies: {
    target: 99.5,
    alertThreshold: 98.0,
  },
  workers: {
    target: 99.5,
    alertThreshold: 98.0,
  },
  admin: {
    // Admin routes should be rock solid
    target: 99.99,
    alertThreshold: 99.5,
  },
};
