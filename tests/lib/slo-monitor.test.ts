import { beforeEach, describe, expect, it } from 'vitest';
import { sloMonitor } from '@/lib/utils/slo-monitor';

describe('lib/utils/slo-monitor.ts', () => {
  beforeEach(() => {
    sloMonitor.reset();
  });

  it('triggers latency alert when p95 exceeds threshold', () => {
    const base = 1_000_000;

    for (let i = 0; i < 10; i++) {
      const alerts = sloMonitor.recordObservation({
        timestamp: base + i,
        latencyMs: 2_500,
        status: 200,
        domain: 'jobs',
      });

      if (i === 9) {
        expect(alerts.some((alert) => alert.name === 'High Latency (P95 > 2s)')).toBe(true);
      }
    }
  });

  it('triggers timeout-rate alert when timeout percentage is above threshold', () => {
    const base = 2_000_000;
    const alerts = sloMonitor.recordObservation({
      timestamp: base,
      latencyMs: 4_000,
      status: 408,
      timedOut: true,
      domain: 'jobs',
    });

    expect(alerts.some((alert) => alert.name === 'High Upstream Timeout Rate')).toBe(true);
  });

  it('triggers auth spike alert when auth failures in the window exceed threshold', () => {
    const base = 3_000_000;
    let lastAlerts = [] as ReturnType<typeof sloMonitor.recordObservation>;

    for (let i = 0; i < 101; i++) {
      lastAlerts = sloMonitor.recordObservation({
        timestamp: base + i,
        latencyMs: 20,
        status: 401,
        authFailure: true,
        domain: 'admin',
      });
    }

    expect(lastAlerts.some((alert) => alert.name === 'Auth Spike (Suspicious Activity)')).toBe(true);
  });

  it('prunes observations outside configured windows', () => {
    const base = 4_000_000;
    sloMonitor.recordObservation({
      timestamp: base,
      latencyMs: 3_000,
      status: 200,
      domain: 'jobs',
    });

    // Move past max configured window (10 minutes).
    const alerts = sloMonitor.recordObservation({
      timestamp: base + (11 * 60 * 1000),
      latencyMs: 100,
      status: 200,
      domain: 'jobs',
    });

    expect(alerts.some((alert) => alert.name === 'High Latency (P95 > 2s)')).toBe(false);
  });
});
