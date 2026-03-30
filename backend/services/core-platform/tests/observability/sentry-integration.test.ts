import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Sentry from '@sentry/node';
import {
  setSentryContext,
  clearSentryContext,
  captureBusinessError,
  captureException,
  captureValidationError,
  captureAuthError,
  captureAuthzError,
  captureOptimisticLockFailure,
  captureIdempotencyViolation,
  captureStateMachineViolation,
  captureCalendarLockViolation,
  captureAdminOverride,
  captureOutboxEventFailure,
  sentryContextMiddleware,
  startTransaction,
  ALERT_RULES,
  type AlertRule,
  SentryContext,
} from '../../src/observability/sentry-integration.js';
import { Request, Response } from 'express';

vi.mock('@sentry/node', () => ({
  setUser: vi.fn(),
  setTags: vi.fn(),
  setContext: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  clearTags: vi.fn(),
  startTransaction: vi.fn(),
}));

const sentryApi = Sentry as unknown as {
  setUser: ReturnType<typeof vi.fn>;
  setTags: ReturnType<typeof vi.fn>;
  setContext: ReturnType<typeof vi.fn>;
  captureMessage: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  clearTags: ReturnType<typeof vi.fn>;
  startTransaction: ReturnType<typeof vi.fn>;
};

describe('Sentry Integration & Error Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    clearSentryContext();
  });

  describe('Context Setting & Tags', () => {
    it('should set user context with id, email, and role', () => {
      const context: SentryContext = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userRole: 'RECRUITER',
      };

      setSentryContext(context);

      expect(sentryApi.setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          email: 'user@example.com',
          username: 'RECRUITER',
        })
      );
    });

    it('should set business entity tags (jobId, workerId, companyId, etc.)', () => {
      const context: SentryContext = {
        userId: 'user-123',
        jobId: 'job-456',
        workerId: 'worker-789',
        companyId: 'company-101',
        availabilityId: 'avail-202',
      };

      setSentryContext(context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          job_id: 'job-456',
          worker_id: 'worker-789',
          company_id: 'company-101',
          availability_id: 'avail-202',
        })
      );
    });

    it('should set status transition tags (fromStatus, toStatus)', () => {
      const context: SentryContext = {
        jobId: 'job-123',
        fromStatus: 'open',
        toStatus: 'in_progress',
      };

      setSentryContext(context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          from_status: 'open',
          to_status: 'in_progress',
        })
      );
    });

    it('should set business action tags', () => {
      const context: SentryContext = {
        adminId: 'admin-123',
        action: 'suspend_company',
        targetId: 'company-456',
      };

      setSentryContext(context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-123',
          action: 'suspend_company',
          target_id: 'company-456',
        })
      );
    });

    it('should set request context (idempotency key, request ID)', () => {
      const context: SentryContext = {
        idempotencyKey: 'idemp-key-123',
        requestId: 'req-456',
        retryCount: 2,
      };

      setSentryContext(context);

      expect(sentryApi.setContext).toHaveBeenCalledWith(
        'business_context',
        expect.objectContaining({
          idempotency_key: 'idemp-key-123',
          request_id: 'req-456',
          retry_count: 2,
        })
      );
    });

    it('should clear context on clearSentryContext()', () => {
      clearSentryContext();

      expect(sentryApi.setUser).toHaveBeenCalledWith(null);
      expect(sentryApi.clearTags).toHaveBeenCalled();
    });
  });

  describe('Business Error Capture', () => {
    it('should capture validation error with field name and reason', () => {
      const context: SentryContext = {
        userId: 'user-123',
        errorCode: 'VALIDATION_ERROR',
        errorReason: 'required_field_missing',
      };

      captureValidationError('title', 'required_field_missing', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Validation error'),
        'warning'
      );
    });

    it('should capture authentication error with reason', () => {
      const context: SentryContext = {
        errorCode: 'AUTH_ERROR',
      };

      captureAuthError('token_expired', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Authentication error'),
        'warning'
      );
    });

    it('should capture authorization error with required permission', () => {
      const context: SentryContext = {
        userId: 'user-123',
        userRole: 'RECRUITER',
      };

      captureAuthzError('ADMIN_WRITE', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Authorization denied'),
        'warning'
      );
    });

    it('should capture optimistic lock failure', () => {
      const context: SentryContext = {
        jobId: 'job-123',
      };

      captureOptimisticLockFailure(context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        'Optimistic lock conflict detected',
        'info'
      );
    });

    it('should mark optimistic lock as retryable', () => {
      const context: SentryContext = {
        jobId: 'job-123',
      };

      captureOptimisticLockFailure(context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: true,
        })
      );
    });

    it('should capture idempotency key violation (payload mismatch)', () => {
      const context: SentryContext = {
        idempotencyKey: 'key-123',
      };

      captureIdempotencyViolation('key-123', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Idempotency'),
        'info'
      );
    });

    it('should capture state machine violation with transition details', () => {
      const context: SentryContext = {
        jobId: 'job-123',
      };

      captureStateMachineViolation('open', 'completed', 'skipped_in_progress', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Invalid state transition: open → completed'),
        'warning'
      );
    });

    it('should capture calendar lock rule violation', () => {
      const context: SentryContext = {
        eventType: 'calendar_lock_violation',
      };

      captureCalendarLockViolation('worker-123', 'job-456', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        'Calendar availability locked within 7-day window',
        'info'
      );
    });

    it('should capture admin override action', () => {
      const context: SentryContext = {
        adminId: 'admin-123',
      };

      captureAdminOverride('admin-123', 'verify_worker', 'worker-456', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Admin override'),
        'info'
      );
    });

    it('should capture outbox event failure with retry context', () => {
      const context: SentryContext = {
        eventType: 'JobCreated',
      };

      captureOutboxEventFailure('JobCreated', 'network_timeout', 2, context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Outbox event publish failed'),
        'error'
      );
    });

    it('should mark outbox failure as retryable if < 3 attempts', () => {
      const context: SentryContext = {
        eventType: 'JobCreated',
      };

      captureOutboxEventFailure('JobCreated', 'network_timeout', 2, context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: true,
        })
      );
    });

    it('should mark outbox failure as non-retryable if >= 3 attempts', () => {
      const context: SentryContext = {
        eventType: 'JobCreated',
      };

      captureOutboxEventFailure('JobCreated', 'network_timeout', 3, context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: false,
        })
      );
    });
  });

  describe('Exception Capture', () => {
    it('should capture error exception with context', () => {
      const error = new Error('Database connection failed');
      const context: SentryContext = {
        userId: 'user-123',
        jobId: 'job-456',
      };

      captureException(error, context);

      expect(sentryApi.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture generic business error', () => {
      const context: SentryContext = {
        userId: 'user-123',
      };

      captureBusinessError('Something went wrong', context, 'error');

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        'Something went wrong',
        'error'
      );
    });

    it('should allow configurable error severity', () => {
      const context: SentryContext = {
        userId: 'user-123',
      };

      captureBusinessError('Warning event', context, 'warning');

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        'Warning event',
        'warning'
      );
    });
  });

  describe('Middleware & Request Context', () => {
    it('should extract and set request ID from headers', () => {
      const mockReq = {
        headers: {
          'x-request-id': 'req-123-abc',
        },
      } as any as Request;

      const mockRes = {} as any as Response;
      const next = vi.fn();

      sentryContextMiddleware(mockReq, mockRes, next);

      expect(mockReq.requestId).toBe('req-123-abc');
      expect(next).toHaveBeenCalled();
    });

    it('should generate request ID if not provided', () => {
      const mockReq = {
        headers: {},
      } as any as Request;

      const mockRes = {} as any as Response;
      const next = vi.fn();

      sentryContextMiddleware(mockReq, mockRes, next);

      expect(mockReq.requestId).toBeDefined();
      expect(typeof mockReq.requestId).toBe('string');
      expect(next).toHaveBeenCalled();
    });

    it('should extract userId and userRole from request', () => {
      const mockReq = {
        headers: {
          'x-request-id': 'req-123',
        },
        userId: 'user-456',
        userRole: 'RECRUITER',
      } as any as Request;

      const mockRes = {} as any as Response;
      const next = vi.fn();

      sentryContextMiddleware(mockReq, mockRes, next);

      expect(sentryApi.setTags).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Transaction Instrumentation', () => {
    it('should start transaction with name and operation', () => {
      sentryApi.startTransaction.mockReturnValue({
        setStatus: vi.fn(),
      } as any);

      startTransaction({
        name: 'POST /api/v1/jobs',
        op: 'http.server',
      });

      expect(sentryApi.startTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'POST /api/v1/jobs',
          op: 'http.server',
        })
      );
    });

    it('should include tags in transaction', () => {
      sentryApi.startTransaction.mockReturnValue({
        setStatus: vi.fn(),
      } as any);

      startTransaction({
        name: 'POST /api/v1/jobs/:id/status',
        op: 'http.server',
        tags: {
          job_id: 'job-123',
          method: 'POST',
        },
      });

      expect(sentryApi.startTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: {
            job_id: 'job-123',
            method: 'POST',
          },
        })
      );
    });
  });

  describe('Alert Rules Registry', () => {
    it('should define critical alert for high error rate', () => {
      const highErrorRateRule = ALERT_RULES.find((rule: AlertRule) => rule.name === 'HighErrorRate');
      expect(highErrorRateRule).toBeDefined();
      expect(highErrorRateRule?.severity).toBe('high');
      expect(highErrorRateRule?.threshold).toBe(1); // 1% error rate
      expect(highErrorRateRule?.window_ms).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should define alert for job creation failures', () => {
      const jobCreationFailuresRule = ALERT_RULES.find(
        (rule: AlertRule) => rule.name === 'JobCreationFailures'
      );
      expect(jobCreationFailuresRule).toBeDefined();
      expect(jobCreationFailuresRule?.severity).toBe('high');
    });

    it('should define critical alert for outbox event failures', () => {
      const outboxFailureRule = ALERT_RULES.find(
        (rule: AlertRule) => rule.name === 'OutboxEventFailures'
      );
      expect(outboxFailureRule).toBeDefined();
      expect(outboxFailureRule?.severity).toBe('critical');
    });

    it('should define alert for optimistic lock conflicts', () => {
      const lockConflictRule = ALERT_RULES.find(
        (rule: AlertRule) => rule.name === 'OptimisticLockConflicts'
      );
      expect(lockConflictRule).toBeDefined();
      expect(lockConflictRule?.severity).toBe('medium');
    });

    it('should define alert for calendar lock violations', () => {
      const calendarLockRule = ALERT_RULES.find(
        (rule: AlertRule) => rule.name === 'CalendarLockViolations'
      );
      expect(calendarLockRule).toBeDefined();
      expect(calendarLockRule?.threshold).toBe(20); // 20 violations
      expect(calendarLockRule?.window_ms).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should define alert for database pool exhaustion', () => {
      const poolExhaustionRule = ALERT_RULES.find(
        (rule: AlertRule) => rule.name === 'DatabasePoolExhaustion'
      );
      expect(poolExhaustionRule).toBeDefined();
      expect(poolExhaustionRule?.severity).toBe('high');
      expect(poolExhaustionRule?.threshold).toBe(90); // 90% utilization
    });

    it('should have at least 6 alert rules defined', () => {
      expect(ALERT_RULES.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Error Severity Classification', () => {
    it('should classify auth errors as warning', () => {
      const context: SentryContext = { errorCode: 'AUTH_ERROR' };
      captureAuthError('token_expired', context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.anything(),
        'warning'
      );
    });

    it('should classify outbox failures as error for alerting', () => {
      const context: SentryContext = { eventType: 'JobCreated' };
      captureOutboxEventFailure('JobCreated', 'permanent_error', 5, context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.anything(),
        'error'
      );
    });

    it('should classify optimistic lock conflicts as info (retry-able)', () => {
      const context: SentryContext = { jobId: 'job-123' };
      captureOptimisticLockFailure(context);

      expect(sentryApi.captureMessage).toHaveBeenCalledWith(
        expect.anything(),
        'info'
      );
    });
  });

  describe('Required Tags Verification', () => {
    it('should require at least 3 tags for job-related errors', () => {
      const context: SentryContext = {
        userId: 'user-123',
        jobId: 'job-456',
        fromStatus: 'open',
        toStatus: 'invalid',
        errorReason: 'state_machine_violation',
      };

      setSentryContext(context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          job_id: 'job-456',
          from_status: 'open',
          to_status: 'invalid',
        })
      );
    });

    it('should require admin-specific tags for admin operations', () => {
      const context: SentryContext = {
        adminId: 'admin-123',
        action: 'suspend_company',
        targetId: 'company-456',
      };

      setSentryContext(context);

      expect(sentryApi.setTags).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-123',
          action: 'suspend_company',
          target_id: 'company-456',
        })
      );
    });
  });

  describe('Context Persistence & Cleanup', () => {
    it('should maintain context across multiple captures', () => {
      const context: SentryContext = {
        userId: 'user-123',
        jobId: 'job-456',
      };

      setSentryContext(context);
      captureValidationError('title', 'required', context);
      captureOptimisticLockFailure(context);

      // Both should have been called with context
      expect(sentryApi.captureMessage).toHaveBeenCalledTimes(2);
    });

    it('should clear context when requested', () => {
      const context: SentryContext = {
        userId: 'user-123',
      };

      setSentryContext(context);
      clearSentryContext();

      expect(sentryApi.setUser).toHaveBeenCalledWith(null);
      expect(sentryApi.clearTags).toHaveBeenCalled();
    });
  });
});
