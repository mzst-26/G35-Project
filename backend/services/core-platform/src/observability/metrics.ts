import { logger } from './logger';

// Metrics for observability and alerting.
//
// This implementation uses structured logging (exported to JSON) as the metrics backend.
// In production, integrate with Prometheus or similar by adapting the emit() function
// to push to Prometheus scrape endpoint (e.g., GET /metrics returns prometheus format).
//
// Metrics are emitted at INFO level to stdout; they are parsed by the logging aggregator
// (Datadog, New Relic, CloudWatch Insight, etc.) and indexed for dashboarding/alerting.

export type MetricType = 'counter' | 'gauge' | 'histogram';

interface MetricEvent {
  metric_name: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  tags: Record<string, string | number | boolean>;
  timestamp: string;
}

class MetricsCollector {
  private metrics: Map<string, number> = new Map();

  // ============================================================================
  // Business Domain Metrics
  // ============================================================================

  // Job Lifecycle
  recordJobCreated(companyId: string, jobCount: number = 1): void {
    this.emit('job.created', 'counter', jobCount, 'jobs', {
      companyId,
      event_type: 'job_created',
    });
  }

  recordJobStatusTransition(
    jobId: string,
    fromStatus: string,
    toStatus: string,
    success: boolean
  ): void {
    this.emit('job.status.transitioned', 'counter', success ? 1 : 0, 'transitions', {
      jobId,
      from_status: fromStatus,
      to_status: toStatus,
      success,
      event_type: 'job_status_changed',
    });
  }

  recordJobTransitionDenied(jobId: string, from: string, to: string, reason: string): void {
    this.emit('job.status.transition.denied', 'counter', 1, 'denials', {
      jobId,
      from_status: from,
      to_status: to,
      reason,
      event_type: 'state_machine_violation',
    });
  }

  // Calendar Availability
  recordCalendarAvailabilityCreated(workerId: string): void {
    this.emit('calendar.availability.created', 'counter', 1, 'availability_slots', {
      workerId,
      event_type: 'availability_added',
    });
  }

  recordCalendarAvailabilityDeleted(workerId: string, deletedWithinLockWindow: boolean): void {
    this.emit(
      'calendar.availability.deleted',
      'counter',
      1,
      'availability_slots',
      {
        workerId,
        within_lock_window: deletedWithinLockWindow,
        event_type: 'availability_removed',
      }
    );
  }

  recordCalendarLockViolationAttempt(workerId: string, jobId: string): void {
    this.emit('calendar.availability.lock_violation', 'counter', 1, 'violations', {
      workerId,
      jobId,
      event_type: 'lock_rule_breach',
    });
  }

  // Admin Operations
  recordAdminOverrideAction(adminId: string, action: string, targetId: string): void {
    this.emit('admin.override.used', 'counter', 1, 'overrides', {
      adminId,
      action,
      targetId,
      event_type: 'admin_action_taken',
    });
  }

  recordCompanyStatusChange(companyId: string, fromStatus: string, toStatus: string): void {
    this.emit('company.status.changed', 'counter', 1, 'status_changes', {
      companyId,
      from_status: fromStatus,
      to_status: toStatus,
      event_type: 'company_status_update',
    });
  }

  recordWorkerVerificationChange(workerId: string, toStatus: string): void {
    this.emit('worker.verification.changed', 'counter', 1, 'verifications', {
      workerId,
      to_status: toStatus,
      event_type: 'worker_verified',
    });
  }

  // ============================================================================
  // Event Publishing Metrics (Outbox Pattern)
  // ============================================================================

  recordOutboxEventPublished(eventType: string, success: boolean, retryCount: number = 0): void {
    this.emit('outbox.event.published', 'counter', success ? 1 : 0, 'events', {
      event_type: eventType,
      success,
      retry_count: retryCount,
      event_category: 'event_bus',
    });
  }

  recordIdempotencyKeyHit(endpoint: string, cacheHit: boolean): void {
    this.emit('idempotency.key.hit', 'counter', cacheHit ? 1 : 0, 'cache_operations', {
      endpoint,
      cache_hit: cacheHit,
      event_type: 'idempotency_check',
    });
  }

  // ============================================================================
  // Performance Metrics (Latency & Throughput)
  // ============================================================================

  recordHttpRequestDuration(method: string, path: string, statusCode: number, durationMs: number): void {
    this.emit('http.request.duration_ms', 'histogram', durationMs, 'milliseconds', {
      method,
      path,
      status_code: statusCode,
      status_class: `${Math.floor(statusCode / 100)}xx`,
      event_type: 'request_completed',
    });
  }

  recordDatabaseQueryDuration(query: string, durationMs: number, success: boolean): void {
    this.emit('db.query.duration_ms', 'histogram', durationMs, 'milliseconds', {
      query_type: this.normalizeQueryType(query),
      success,
      event_type: 'database_operation',
    });
  }

  recordConcurrentWrite(success: boolean, conflictResolution: 'version_check' | 'retry' | 'abort'): void {
    this.emit('concurrent.write.resolved', 'counter', 1, 'operations', {
      success,
      conflict_resolution: conflictResolution,
      event_type: 'optimistic_lock_check',
    });
  }

  // ============================================================================
  // Error & Exception Metrics
  // ============================================================================

  recordValidationError(endpoint: string, fieldName: string, reason: string): void {
    this.emit('validation.error', 'counter', 1, 'errors', {
      endpoint,
      field_name: fieldName,
      reason,
      error_type: 'input_validation',
    });
  }

  recordAuthenticationFailure(reason: string): void {
    this.emit('authentication.failure', 'counter', 1, 'failures', {
      reason,
      error_type: 'auth_failed',
    });
  }

  recordAuthorizationFailure(requiredPermission: string, userRole: string): void {
    this.emit('authorization.failure', 'counter', 1, 'failures', {
      required_permission: requiredPermission,
      user_role: userRole,
      error_type: 'insufficient_permissions',
    });
  }

  recordRateLimitExceeded(limiterName: string, userId?: string): void {
    this.emit('rate_limit.exceeded', 'counter', 1, 'violations', {
      limiter_name: limiterName,
      user_id: userId || 'anonymous',
      event_type: 'rate_limit_hit',
    });
  }

  recordServiceError(errorType: string, endpoint: string, statusCode: number): void {
    this.emit('service.error', 'counter', 1, 'errors', {
      error_type: errorType,
      endpoint,
      status_code: statusCode,
      error_category: 'unhandled_exception',
    });
  }

  // ============================================================================
  // Resource Utilization Metrics
  // ============================================================================

  recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.emit('memory.heap_used_mb', 'gauge', memUsage.heapUsed / 1024 / 1024, 'megabytes', {
      event_type: 'resource_utilization',
    });
    this.emit('memory.heap_total_mb', 'gauge', memUsage.heapTotal / 1024 / 1024, 'megabytes', {
      event_type: 'resource_utilization',
    });
    this.emit('memory.external_mb', 'gauge', memUsage.external / 1024 / 1024, 'megabytes', {
      event_type: 'resource_utilization',
    });
  }

  recordActiveConnections(count: number): void {
    this.emit('http.connections.active', 'gauge', count, 'connections', {
      event_type: 'connection_pool',
    });
  }

  recordDatabasePoolUtilization(used: number, total: number): void {
    const percentUsed = (used / total) * 100;
    this.emit('db.pool.utilization_percent', 'gauge', percentUsed, 'percent', {
      pool_used: used,
      pool_total: total,
      event_type: 'resource_utilization',
    });
  }

  // ============================================================================
  // Custom Metric Emission
  // ============================================================================

  private emit(
    metricName: string,
    metricType: MetricType,
    value: number,
    unit: string,
    tags: Record<string, string | number | boolean>
  ): void {
    const event: MetricEvent = {
      metric_name: metricName,
      metric_type: metricType,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString(),
    };

    // Log at DEBUG level so metrics can be aggregated without cluttering INFO logs
    // In production, adjust log level or use a separate metrics sink
    logger.debug(`[METRIC] ${metricName}`, {
      metric: event,
      ...tags,
    });

    // Optional: Update in-memory aggregate for occasional summary
    this.updateAggregate(metricName, value);
  }

  private updateAggregate(metricName: string, value: number): void {
    const current = this.metrics.get(metricName) || 0;
    this.metrics.set(metricName, current + value);
  }

  private normalizeQueryType(query: string): string {
    if (query.match(/^SELECT/i)) return 'select';
    if (query.match(/^INSERT/i)) return 'insert';
    if (query.match(/^UPDATE/i)) return 'update';
    if (query.match(/^DELETE/i)) return 'delete';
    return 'unknown';
  }

  // ============================================================================
  // Metrics Summary (for periodic emission or debugging)
  // ============================================================================

  getSummary(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// ============================================================================
// Express Middleware for Automatic Metrics Collection
// ============================================================================

import { Request, Response, NextFunction } from 'express';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture end of response
  const originalEnd = res.end.bind(res);
  res.end = function (...args: any[]) {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record HTTP request metrics
    metrics.recordHttpRequestDuration(req.method, req.path, statusCode, durationMs);

    // Return to normal flow
    return originalEnd(...args);
  };

  next();
}

// ============================================================================
// Periodic Metrics Export (for debugging)
// ============================================================================

export function startPeriodicMetricsExport(intervalMs: number = 60000): void {
  setInterval(() => {
    const summary = metrics.getSummary();
    logger.info('Metrics Summary', {
      metrics_count: Object.keys(summary).length,
      top_metrics: Object.entries(summary)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      export_timestamp: new Date().toISOString(),
    });
  }, intervalMs);
}

// ============================================================================
// Prometheus Export Format (future enhancement)
// ============================================================================

export function exportPrometheus(): string {
  // TODO: Implement Prometheus scrape endpoint format
  // GET /metrics should return:
  // # HELP metric_name Description
  // # TYPE metric_name counter
  // metric_name{label="value"} 123
  
  let output = '';
  const summary = metrics.getSummary();
  
  for (const [metricName, value] of Object.entries(summary)) {
    output += `# TYPE ${metricName} gauge\n`;
    output += `${metricName} ${value}\n`;
  }

  return output;
}

// ============================================================================
// Re-exports for convenient importing
// ============================================================================

export default metrics;
