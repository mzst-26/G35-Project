// Circuit breaker pattern to protect against upstream cascades
// Monitors failure rate and backs off if threshold exceeded

import { logger } from './logger';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number; // % of requests that must fail to open (e.g., 50)
  successThreshold: number; // # of successes needed in half-open to close (e.g., 2)
  timeout: number; // ms to wait before moving from open to half-open (e.g., 30000)
  windowSize: number; // # of recent requests to track (e.g., 100)
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  lastFailureTime?: number;
  lastStateChangeTime: number;
}

// Default: conservative, backend-friendly
const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 50, // Open if >50% fail
  successThreshold: 2, // Need 2 successes to close
  timeout: 30000, // Wait 30s before half-open
  windowSize: 100, // Track last 100 requests
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    failedRequests: 0,
    successfulRequests: 0,
    lastStateChangeTime: Date.now(),
  };
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  recordSuccess(): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;

    if (this.state === 'half-open') {
      if (this.metrics.successfulRequests >= this.config.successThreshold) {
        this.closeCircuit();
      }
    }

    this.trimMetrics();
  }

  recordFailure(): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = Date.now();

    this.checkFailureThreshold();
    this.trimMetrics();
  }

  isOpen(): boolean {
    if (this.state === 'open') {
      const timeSinceOpen = Date.now() - this.metrics.lastStateChangeTime;
      if (timeSinceOpen > this.config.timeout) {
        this.state = 'half-open';
        this.metrics.successfulRequests = 0;
      }
    }

    return this.state === 'open';
  }

  isHalfOpen(): boolean {
    return this.state === 'half-open';
  }

  getState(): CircuitState {
    return this.state;
  }

  private checkFailureThreshold(): void {
    if (this.state === 'closed' && this.metrics.totalRequests >= 10) {
      const failureRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;

      if (failureRate > this.config.failureThreshold) {
        this.openCircuit();
      }
    }
  }

  private openCircuit(): void {
    logger.warn(`Circuit breaker OPEN for ${this.constructor.name}`, {
      failureRate: ((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(1),
      failedRequests: this.metrics.failedRequests,
      totalRequests: this.metrics.totalRequests,
    });

    this.state = 'open';
    this.metrics.lastStateChangeTime = Date.now();
  }

  private closeCircuit(): void {
    logger.info(`Circuit breaker CLOSED for ${this.constructor.name}`);

    this.state = 'closed';
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      lastStateChangeTime: Date.now(),
    };
  }

  private trimMetrics(): void {
    if (this.metrics.totalRequests > this.config.windowSize) {
      const overage = this.metrics.totalRequests - this.config.windowSize;
      const failureRatio = this.metrics.failedRequests / this.metrics.totalRequests;

      this.metrics.totalRequests = this.config.windowSize;
      this.metrics.failedRequests = Math.floor(this.config.windowSize * failureRatio);
      this.metrics.successfulRequests = this.config.windowSize - this.metrics.failedRequests;
    }
  }

  getMetrics() {
    return {
      state: this.state,
      totalRequests: this.metrics.totalRequests,
      failedRequests: this.metrics.failedRequests,
      failureRate: this.metrics.totalRequests > 0
        ? ((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(1)
        : '0',
      lastFailureTime: this.metrics.lastFailureTime,
    };
  }
}

// Pre-configured circuit breaker for core-platform upstream
export const coreUpstreamBreaker = new CircuitBreaker({
  failureThreshold: 50,
  successThreshold: 3,
  timeout: 60000, // 1 minute before retry
  windowSize: 100,
});
