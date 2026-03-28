interface SloObservation {
  latencyMs: number;
  status: number;
  timedOut: boolean;
  authFailure: boolean;
  domain: string;
}

const LATENCY_ALERT_THRESHOLD_MS = 2000;

function shouldAlertOnStatus(status: number): boolean {
  return status >= 500;
}

function shouldAlertOnLatency(latencyMs: number): boolean {
  return latencyMs > LATENCY_ALERT_THRESHOLD_MS;
}

class SloMonitor {
  recordObservation(observation: SloObservation): string[] {
    const alerts: string[] = [];

    if (observation.timedOut) {
      alerts.push('timeout');
    }

    if (observation.authFailure) {
      alerts.push('auth_failure');
    }

    if (shouldAlertOnStatus(observation.status)) {
      alerts.push('server_error');
    }

    if (shouldAlertOnLatency(observation.latencyMs)) {
      alerts.push('high_latency');
    }

    if (alerts.length === 0) {
      return [];
    }

    return alerts.map((alert) => `${observation.domain}:${alert}`);
  }
}

export const sloMonitor = new SloMonitor();
