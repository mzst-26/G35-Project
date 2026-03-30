import { describe, it, expect, beforeEach, vi } from 'vitest';
import { metrics, metricsMiddleware, exportPrometheus } from '../../src/observability/metrics.js';
import { Request, Response } from 'express';

describe('Metrics Collection & Observability', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('Job Lifecycle Metrics', () => {
    it('should record job creation', () => {
      metrics.recordJobCreated('company-123');
      metrics.recordJobCreated('company-456', 3);

      const summary = metrics.getSummary();
      expect(summary['job.created']).toBe(4); // 1 + 3
    });

    it('should record job status transitions', () => {
      metrics.recordJobStatusTransition('job-1', 'open', 'in_progress', true);
      metrics.recordJobStatusTransition('job-2', 'in_progress', 'completed', true);
      metrics.recordJobStatusTransition('job-3', 'open', 'in_progress', false);

      const summary = metrics.getSummary();
      expect(summary['job.status.transitioned']).toBe(3);
    });

    it('should record denied status transitions', () => {
      metrics.recordJobTransitionDenied('job-1', 'open', 'completed', 'invalid_state_machine_path');
      metrics.recordJobTransitionDenied('job-2', 'pending', 'resolved', 'not_in_progress');

      const summary = metrics.getSummary();
      expect(summary['job.status.transition.denied']).toBe(2);
    });
  });

  describe('Calendar Metrics', () => {
    it('should record availability creation', () => {
      metrics.recordCalendarAvailabilityCreated('worker-1');
      metrics.recordCalendarAvailabilityCreated('worker-2');

      const summary = metrics.getSummary();
      expect(summary['calendar.availability.created']).toBe(2);
    });

    it('should record availability deletion', () => {
      metrics.recordCalendarAvailabilityDeleted('worker-1', false); // Outside lock window
      metrics.recordCalendarAvailabilityDeleted('worker-2', true); // Within lock window

      const summary = metrics.getSummary();
      expect(summary['calendar.availability.deleted']).toBe(2);
    });

    it('should record calendar lock violations', () => {
      metrics.recordCalendarLockViolationAttempt('worker-1', 'job-123');
      metrics.recordCalendarLockViolationAttempt('worker-2', 'job-456');

      const summary = metrics.getSummary();
      expect(summary['calendar.availability.lock_violation']).toBe(2);
    });
  });

  describe('Admin Operation Metrics', () => {
    it('should record admin override actions', () => {
      metrics.recordAdminOverrideAction('admin-1', 'suspend_company', 'company-123');
      metrics.recordAdminOverrideAction('admin-1', 'verify_worker', 'worker-456');

      const summary = metrics.getSummary();
      expect(summary['admin.override.used']).toBe(2);
    });

    it('should record company status changes', () => {
      metrics.recordCompanyStatusChange('company-1', 'pending', 'approved');
      metrics.recordCompanyStatusChange('company-2', 'approved', 'suspended');

      const summary = metrics.getSummary();
      expect(summary['company.status.changed']).toBe(2);
    });

    it('should record worker verification changes', () => {
      metrics.recordWorkerVerificationChange('worker-1', 'verified');
      metrics.recordWorkerVerificationChange('worker-2', 'rejected');

      const summary = metrics.getSummary();
      expect(summary['worker.verification.changed']).toBe(2);
    });
  });

  describe('Event Publishing Metrics', () => {
    it('should record outbox event publications', () => {
      metrics.recordOutboxEventPublished('JobCreated', true, 0);
      metrics.recordOutboxEventPublished('JobStatusChanged', true, 0);
      metrics.recordOutboxEventPublished('CalendarLocked', true, 1);

      const summary = metrics.getSummary();
      expect(summary['outbox.event.published']).toBe(3);
    });

    it('should record idempotency key hits', () => {
      metrics.recordIdempotencyKeyHit('POST /api/v1/jobs', true); // Cache hit
      metrics.recordIdempotencyKeyHit('POST /api/v1/jobs', false); // Cache miss
      metrics.recordIdempotencyKeyHit('PATCH /api/v1/workers/:id', false); // Cache miss

      const summary = metrics.getSummary();
      expect(summary['idempotency.key.hit']).toBe(3);
    });
  });

  describe('Performance Metrics', () => {
    it('should record HTTP request duration', () => {
      metrics.recordHttpRequestDuration('GET', '/api/v1/jobs', 200, 42);
      metrics.recordHttpRequestDuration('POST', '/api/v1/jobs', 201, 128);
      metrics.recordHttpRequestDuration('PATCH', '/api/v1/jobs/123', 200, 67);

      const summary = metrics.getSummary();
      expect(summary['http.request.duration_ms']).toBe(42 + 128 + 67);
    });

    it('should record database query duration', () => {
      metrics.recordDatabaseQueryDuration('SELECT * FROM jobs', 12, true);
      metrics.recordDatabaseQueryDuration('INSERT INTO jobs', 5, true);
      metrics.recordDatabaseQueryDuration('UPDATE jobs SET status', 8, true);

      const summary = metrics.getSummary();
      expect(summary['db.query.duration_ms']).toBe(12 + 5 + 8);
    });

    it('should record concurrent write resolutions', () => {
      metrics.recordConcurrentWrite(true, 'version_check');
      metrics.recordConcurrentWrite(false, 'abort');
      metrics.recordConcurrentWrite(true, 'retry');

      const summary = metrics.getSummary();
      expect(summary['concurrent.write.resolved']).toBe(3);
    });
  });

  describe('Error Metrics', () => {
    it('should record validation errors', () => {
      metrics.recordValidationError('POST /api/v1/jobs', 'title', 'required_field_missing');
      metrics.recordValidationError('PATCH /api/v1/workers/:id', 'email', 'invalid_email_format');

      const summary = metrics.getSummary();
      expect(summary['validation.error']).toBe(2);
    });

    it('should record authentication failures', () => {
      metrics.recordAuthenticationFailure('token_expired');
      metrics.recordAuthenticationFailure('invalid_signature');
      metrics.recordAuthenticationFailure('token_not_provided');

      const summary = metrics.getSummary();
      expect(summary['authentication.failure']).toBe(3);
    });

    it('should record authorization failures', () => {
      metrics.recordAuthorizationFailure('JOB_UPDATE', 'RECRUITER');
      metrics.recordAuthorizationFailure('ADMIN_WRITE', 'TRADE');

      const summary = metrics.getSummary();
      expect(summary['authorization.failure']).toBe(2);
    });

    it('should record rate limit violations', () => {
      metrics.recordRateLimitExceeded('readLimit', 'user-1');
      metrics.recordRateLimitExceeded('writeLimit', 'user-2');
      metrics.recordRateLimitExceeded('adminLimit');

      const summary = metrics.getSummary();
      expect(summary['rate_limit.exceeded']).toBe(3);
    });

    it('should record service errors', () => {
      metrics.recordServiceError('DatabaseError', 'POST /api/v1/jobs', 500);
      metrics.recordServiceError('TimeoutError', 'GET /api/v1/jobs', 504);
      metrics.recordServiceError('InternalError', 'PATCH /api/v1/workers/:id', 500);

      const summary = metrics.getSummary();
      expect(summary['service.error']).toBe(3);
    });
  });

  describe('Resource Utilization Metrics', () => {
    it('should record memory usage', () => {
      metrics.recordMemoryUsage();

      const summary = metrics.getSummary();
      expect(summary['memory.heap_used_mb']).toBeGreaterThan(0);
      expect(summary['memory.heap_total_mb']).toBeGreaterThan(0);
      expect(summary['memory.external_mb']).toBeGreaterThanOrEqual(0);
    });

    it('should record active connections', () => {
      metrics.recordActiveConnections(5);
      metrics.recordActiveConnections(8);

      const summary = metrics.getSummary();
      expect(summary['http.connections.active']).toBe(13);
    });

    it('should record database pool utilization', () => {
      metrics.recordDatabasePoolUtilization(8, 10); // 80% used
      metrics.recordDatabasePoolUtilization(9, 10); // 90% used

      const summary = metrics.getSummary();
      expect(summary['db.pool.utilization_percent']).toBe(170); // 80 + 90
    });
  });

  describe('Metrics Aggregation', () => {
    it('should accumulate values across multiple calls', () => {
      metrics.recordJobCreated('company-1');
      metrics.recordJobCreated('company-2');
      metrics.recordJobCreated('company-3', 5);

      const summary = metrics.getSummary();
      expect(summary['job.created']).toBe(7); // 1 + 1 + 5
    });

    it('should track multiple distinct metrics', () => {
      metrics.recordJobCreated('company-1');
      metrics.recordCalendarAvailabilityCreated('worker-1');
      metrics.recordAdminOverrideAction('admin-1', 'verify', 'worker-1');
      metrics.recordValidationError('POST /jobs', 'title', 'required');

      const summary = metrics.getSummary();
      expect(Object.keys(summary).length).toBeGreaterThanOrEqual(4);
    });

    it('should reset metrics', () => {
      metrics.recordJobCreated('company-1');
      metrics.recordJobCreated('company-2');

      let summary = metrics.getSummary();
      expect(summary['job.created']).toBe(2);

      metrics.reset();

      summary = metrics.getSummary();
      expect(summary['job.created']).toBeUndefined();
    });
  });

  describe('Metrics Middleware', () => {
    it('should record request durations', async () => {
      const mockReq = { method: 'GET', path: '/api/v1/jobs' } as Request;
      const mockRes = {
        statusCode: 200,
        end: vi.fn(),
      } as unknown as Response;

      metricsMiddleware(mockReq, mockRes, () => {});

      // Trigger wrapped end callback recorded by middleware.
      mockRes.end();

      const summary = metrics.getSummary();
      expect(summary['http.request.duration_ms']).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Prometheus Export Format', () => {
    it('should export metrics in Prometheus format', () => {
      metrics.recordJobCreated('company-1');
      metrics.recordCommandError('JobCreated', true);

      const prometheus = exportPrometheus();
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('job.created');
    });

    it('should include metric names and values', () => {
      metrics.recordHttpRequestDuration('GET', '/health', 200, 5);

      const prometheus = exportPrometheus();
      expect(prometheus).toContain('http.request.duration_ms');
      expect(prometheus).toContain('5');
    });
  });

  describe('Metrics Isolation (no cross-test pollution)', () => {
    it('test 1: records metrics', () => {
      metrics.recordJobCreated('company-1');
      expect(metrics.getSummary()['job.created']).toBe(1);
    });

    it('test 2: starts fresh', () => {
      // Reset called in beforeEach, so this should be clean
      expect(metrics.getSummary()['job.created']).toBeUndefined();
    });

    it('test 3: independent metrics', () => {
      metrics.recordCalendarAvailabilityCreated('worker-1');
      expect(metrics.getSummary()['calendar.availability.created']).toBe(1);
      expect(metrics.getSummary()['job.created']).toBeUndefined();
    });
  });

  describe('Metrics Consistency', () => {
    it('should maintain consistent counter increments', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordJobCreated('company-1');
      }

      expect(metrics.getSummary()['job.created']).toBe(100);
    });

    it('should handle large values', () => {
      metrics.recordHttpRequestDuration('GET', '/api/v1/jobs', 200, 999999);
      metrics.recordHttpRequestDuration('GET', '/api/v1/jobs', 200, 1);

      expect(metrics.getSummary()['http.request.duration_ms']).toBe(1000000);
    });
  });

  describe('Metrics Type Safety', () => {
    it('should accept string, number, and boolean tags', () => {
      metrics.recordAdminOverrideAction('admin-1', 'verify_worker', 'worker-1');
      metrics.recordConcurrentWrite(true, 'version_check');
      metrics.recordMemoryUsage();

      const summary = metrics.getSummary();
      expect(Object.keys(summary).length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should not throw on missing parameters', () => {
      expect(() => {
        metrics.recordJobCreated('');
      }).not.toThrow();

      expect(() => {
        metrics.recordHttpRequestDuration('', '', 0, 0);
      }).not.toThrow();
    });

    it('should handle edge case values gracefully', () => {
      metrics.recordHttpRequestDuration('GET', '/test', 200, 0);
      metrics.recordDatabasePoolUtilization(0, 10);
      metrics.recordMemoryUsage();

      const summary = metrics.getSummary();
      expect(Object.keys(summary).length).toBeGreaterThan(0);
    });
  });
});
