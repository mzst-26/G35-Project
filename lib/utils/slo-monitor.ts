import { ALERT_POLICIES } from '@/lib/utils/slo-config';

type Severity = 'warning' | 'critical';

export interface ProxyObservation {
  timestamp?: number;
  latencyMs: number;
  status: number;
  timedOut?: boolean;
  authFailure?: boolean;
  circuitBreakerOpen?: boolean;
  domain?: string;
}

interface WindowSample {
  timestamp: number;
  latencyMs: number;
  is5xx: boolean;
  isTimeout: boolean;
  isAuthFailure: boolean;
  circuitBreakerOpen: boolean;
}

export interface TriggeredAlert {
  name: string;
  severity: Severity;
  metric: string;
  threshold: number;
  currentValue: number;
  evaluationWindowMs: number;
  domain?: string;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.max(0, Math.min(rank, sorted.length - 1));
  return sorted[index];
}

class SloMonitor {
  private samples: WindowSample[] = [];
  private readonly maxWindowMs = Math.max(...ALERT_POLICIES.map((policy) => policy.evaluationWindowMs));

  reset(): void {
    this.samples = [];
  }

  recordObservation(observation: ProxyObservation): TriggeredAlert[] {
    const now = observation.timestamp ?? Date.now();

    this.samples.push({
      timestamp: now,
      latencyMs: observation.latencyMs,
      is5xx: observation.status >= 500,
      isTimeout: Boolean(observation.timedOut),
      isAuthFailure: Boolean(observation.authFailure),
      circuitBreakerOpen: Boolean(observation.circuitBreakerOpen),
    });

    this.prune(now);
    return this.evaluatePolicies(now, observation.domain);
  }

  private prune(now: number): void {
    const cutoff = now - this.maxWindowMs;
    this.samples = this.samples.filter((sample) => sample.timestamp >= cutoff);
  }

  private evaluatePolicies(now: number, domain?: string): TriggeredAlert[] {
    const triggered: TriggeredAlert[] = [];

    for (const policy of ALERT_POLICIES) {
      const windowSamples = this.samples.filter(
        (sample) => sample.timestamp >= now - policy.evaluationWindowMs,
      );

      if (windowSamples.length === 0) {
        continue;
      }

      let currentValue = 0;
      switch (policy.metric) {
        case 'proxy_requests_5xx_total / proxy_requests_total': {
          const errorCount = windowSamples.filter((sample) => sample.is5xx).length;
          currentValue = (errorCount / windowSamples.length) * 100;
          break;
        }
        case 'proxy_requests_timeout_total / proxy_requests_total': {
          const timeoutCount = windowSamples.filter((sample) => sample.isTimeout).length;
          currentValue = (timeoutCount / windowSamples.length) * 100;
          break;
        }
        case 'proxy_auth_failures_total': {
          currentValue = windowSamples.filter((sample) => sample.isAuthFailure).length;
          break;
        }
        case 'histogram_quantile(0.95, proxy_latency_ms)': {
          currentValue = percentile(
            windowSamples.map((sample) => sample.latencyMs),
            95,
          );
          break;
        }
        case 'circuit_breaker_state{name="core_upstream"}': {
          currentValue = windowSamples.some((sample) => sample.circuitBreakerOpen) ? 1 : 0;
          break;
        }
        default:
          continue;
      }

      const isTriggered =
        policy.condition === 'above'
          ? currentValue > policy.threshold
          : currentValue < policy.threshold;

      if (isTriggered) {
        triggered.push({
          name: policy.name,
          severity: policy.alertSeverity,
          metric: policy.metric,
          threshold: policy.threshold,
          currentValue,
          evaluationWindowMs: policy.evaluationWindowMs,
          domain,
        });
      }
    }

    return triggered;
  }
}

export const sloMonitor = new SloMonitor();
