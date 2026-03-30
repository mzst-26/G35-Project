interface SloObservation {
  timestamp?: number;
  latencyMs: number;
  status: number;
  timedOut: boolean;
  authFailure: boolean;
  domain: string;
}

interface SloAlert {
  name: string;
  domain: string;
}

const LATENCY_ALERT_THRESHOLD_MS = 2000;
const LATENCY_WINDOW_MS = 10 * 60 * 1000;
const TIMEOUT_WINDOW_MS = 60 * 1000;
const AUTH_WINDOW_MS = 60 * 1000;

const LATENCY_P95_THRESHOLD_MS = 2000;
const TIMEOUT_RATE_THRESHOLD = 0.2;
const AUTH_SPIKE_THRESHOLD = 100;

function shouldAlertOnStatus(status: number): boolean {
  return status >= 500;
}

function shouldAlertOnLatency(latencyMs: number): boolean {
  return latencyMs > LATENCY_ALERT_THRESHOLD_MS;
}

class SloMonitor {
  private observationsByDomain = new Map<string, Array<SloObservation & { timestamp: number }>>();

  reset(): void {
    this.observationsByDomain.clear();
  }

  recordObservation(observation: SloObservation): SloAlert[] {
    const timestamp = observation.timestamp ?? Date.now();
    const enriched = { ...observation, timestamp };
    const alerts: SloAlert[] = [];

    const existing = this.observationsByDomain.get(observation.domain) ?? [];
    existing.push(enriched);
    this.observationsByDomain.set(observation.domain, existing);
    this.prune(observation.domain, timestamp);

    if (observation.timedOut) {
      const timeoutWindow = this.getWindow(observation.domain, timestamp - TIMEOUT_WINDOW_MS);
      const timeoutCount = timeoutWindow.filter((item) => item.timedOut || item.status === 408).length;
      const timeoutRate = timeoutWindow.length > 0 ? timeoutCount / timeoutWindow.length : 0;
      if (timeoutRate >= TIMEOUT_RATE_THRESHOLD) {
        alerts.push({ name: 'High Upstream Timeout Rate', domain: observation.domain });
      }
    }

    if (observation.authFailure) {
      const authWindow = this.getWindow(observation.domain, timestamp - AUTH_WINDOW_MS);
      const authFailures = authWindow.filter((item) => item.authFailure || item.status === 401 || item.status === 403).length;
      if (authFailures > AUTH_SPIKE_THRESHOLD) {
        alerts.push({ name: 'Auth Spike (Suspicious Activity)', domain: observation.domain });
      }
    }

    if (shouldAlertOnStatus(observation.status)) {
      alerts.push({ name: 'Upstream Server Error', domain: observation.domain });
    }

    const latencyWindow = this.getWindow(observation.domain, timestamp - LATENCY_WINDOW_MS);
    const p95Latency = this.computeP95(latencyWindow.map((item) => item.latencyMs));
    if (p95Latency > LATENCY_P95_THRESHOLD_MS || shouldAlertOnLatency(observation.latencyMs)) {
      alerts.push({ name: 'High Latency (P95 > 2s)', domain: observation.domain });
    }

    return alerts;
  }

  private getWindow(domain: string, minTimestamp: number): Array<SloObservation & { timestamp: number }> {
    const observations = this.observationsByDomain.get(domain) ?? [];
    return observations.filter((item) => item.timestamp >= minTimestamp);
  }

  private prune(domain: string, now: number): void {
    const observations = this.observationsByDomain.get(domain) ?? [];
    const minTimestamp = now - LATENCY_WINDOW_MS;
    this.observationsByDomain.set(
      domain,
      observations.filter((item) => item.timestamp >= minTimestamp),
    );
  }

  private computeP95(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const percentileIndex = Math.ceil(sorted.length * 0.95) - 1;
    const safeIndex = Math.min(sorted.length - 1, Math.max(0, percentileIndex));
    return sorted[safeIndex];
  }
}

export const sloMonitor = new SloMonitor();
