import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Sentry integration for error tracking, performance monitoring, and alerting.
//
// This module:
// 1. Configures Sentry with proper DSN and environment
// 2. Defines required context tags for all error events
// 3. Provides middleware for automatic error capture
// 4. Implements custom error handlers for business logic exceptions
// 5. Tracks performance transactions for critical endpoints

// ============================================================================
// Required Tags Taxonomy
// ============================================================================

export interface SentryContext {
  // User & Authentication
  userId?: string;
  userRole?: string;
  userEmail?: string;

  // Business Entity References
  jobId?: string;
  workerId?: string;
  companyId?: string;
  availabilityId?: string;
  adminId?: string;
  targetId?: string; // For admin actions

  // Business Logic State
  fromStatus?: string;
  toStatus?: string;
  action?: string;
  eventType?: string;

  // Transaction/Request Context
  idempotencyKey?: string;
  requestId?: string;
  retryCount?: number;

  // Error Context
  errorCode?: string;
  errorReason?: string;
  isRetryable?: boolean;
}

// ============================================================================
// Sentry Context Setters
// ============================================================================

export function setSentryContext(context: SentryContext): void {
  // User context
  if (context.userId) {
    Sentry.setUser({
      id: context.userId,
      email: context.userEmail,
      username: context.userRole,
    });
  }

  // Custom tags for filtering & alerting
  const tags: Record<string, string | number | boolean> = {};

  if (context.userId) tags.user_id = context.userId;
  if (context.userRole) tags.user_role = context.userRole;
  if (context.jobId) tags.job_id = context.jobId;
  if (context.workerId) tags.worker_id = context.workerId;
  if (context.companyId) tags.company_id = context.companyId;
  if (context.availabilityId) tags.availability_id = context.availabilityId;
  if (context.adminId) tags.admin_id = context.adminId;
  if (context.targetId) tags.target_id = context.targetId;
  if (context.fromStatus) tags.from_status = context.fromStatus;
  if (context.toStatus) tags.to_status = context.toStatus;
  if (context.action) tags.action = context.action;
  if (context.eventType) tags.event_type = context.eventType;
  if (context.isRetryable !== undefined) tags.retryable = context.isRetryable;

  Sentry.setTags(tags);

  // Additional context data
  const contextData: Record<string, any> = {};
  if (context.idempotencyKey) contextData.idempotency_key = context.idempotencyKey;
  if (context.requestId) contextData.request_id = context.requestId;
  if (context.retryCount !== undefined) contextData.retry_count = context.retryCount;
  if (context.errorCode) contextData.error_code = context.errorCode;
  if (context.errorReason) contextData.error_reason = context.errorReason;

  Sentry.setContext('business_context', contextData);
}

export function clearSentryContext(): void {
  Sentry.setUser(null);
  Sentry.clearTags();
}

// ============================================================================
// Error Capture Functions
// ============================================================================

// Capture business logic errors (e.g., state machine violations)
export function captureBusinessError(
  message: string,
  context: SentryContext,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'error'
): void {
  setSentryContext(context);
  Sentry.captureMessage(message, level);
}

// Capture exception with full context
export function captureException(error: Error | unknown, context: SentryContext): void {
  setSentryContext(context);
  Sentry.captureException(error);
}

// Capture validation error
export function captureValidationError(
  fieldName: string,
  reason: string,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    errorCode: 'VALIDATION_ERROR',
    errorReason: reason,
  });
  Sentry.captureMessage(`Validation error: ${fieldName} - ${reason}`, 'warning');
}

// Capture authentication error
export function captureAuthError(reason: string, context: SentryContext): void {
  setSentryContext({
    ...context,
    errorCode: 'AUTH_ERROR',
    errorReason: reason,
  });
  Sentry.captureMessage(`Authentication error: ${reason}`, 'warning');
}

// Capture authorization error
export function captureAuthzError(
  requiredPermission: string,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    errorCode: 'AUTHZ_ERROR',
    errorReason: `Required permission: ${requiredPermission}`,
  });
  Sentry.captureMessage(`Authorization denied: ${requiredPermission}`, 'warning');
}

// Capture race condition / optimistic lock failure
export function captureOptimisticLockFailure(context: SentryContext): void {
  setSentryContext({
    ...context,
    errorCode: 'OPTIMISTIC_LOCK_FAILURE',
    isRetryable: true,
  });
  Sentry.captureMessage('Optimistic lock conflict detected', 'info');
}

// Capture idempotency violation (409 Conflict)
export function captureIdempotencyViolation(
  idempotencyKey: string,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    idempotencyKey,
    errorCode: 'IDEMPOTENCY_VIOLATION',
  });
  Sentry.captureMessage('Idempotency key mismatch: payload differs from original', 'info');
}

// Capture state machine violation
export function captureStateMachineViolation(
  from: string,
  to: string,
  reason: string,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    fromStatus: from,
    toStatus: to,
    errorCode: 'STATE_MACHINE_VIOLATION',
    errorReason: reason,
  });
  Sentry.captureMessage(`Invalid state transition: ${from} → ${to}: ${reason}`, 'warning');
}

// Capture calendar lock rule violation
export function captureCalendarLockViolation(
  workerId: string,
  jobId: string,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    workerId,
    jobId,
    eventType: 'calendar_lock_violation',
    errorCode: 'CALENDAR_LOCK_VIOLATION',
  });
  Sentry.captureMessage('Calendar availability locked within 7-day window', 'info');
}

// Capture admin override action
export function captureAdminOverride(
  adminId: string,
  action: string,
  targetId: string,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    adminId,
    action,
    targetId,
    eventType: 'admin_override',
  });
  Sentry.captureMessage(`Admin override: ${action} on ${targetId}`, 'info');
}

// Capture outbox event failure
export function captureOutboxEventFailure(
  eventType: string,
  reason: string,
  retryCount: number,
  context: SentryContext
): void {
  setSentryContext({
    ...context,
    eventType,
    errorCode: 'OUTBOX_EVENT_FAILURE',
    errorReason: reason,
    retryCount,
    isRetryable: retryCount < 3, // Retryable if attempts < 3
  });
  Sentry.captureMessage(`Outbox event publish failed: ${eventType} - ${reason}`, 'error');
}

// ============================================================================
// Express Middleware for Automatic Context Injection
// ============================================================================

export function sentryContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract request ID from headers or generate one
  const requestId = (req.headers['x-request-id'] as string) || req.id || generateRequestId();
  (req as any).requestId = requestId;

  // Extract user info from JWT claims (if authenticated)
  const userId = (req as any).userId;
  const userRole = (req as any).userRole;

  // Set Sentry context for this request
  setSentryContext({
    requestId,
    userId,
    userRole,
  });

  next();
}

// ============================================================================
// Performance Monitoring Transactions
// ============================================================================

export interface TransactionOptions {
  name: string;
  op: 'http.server' | 'db' | 'http.client' | 'queue.process' | 'gql' | 'task' | string;
  tags?: Record<string, string | number | boolean>;
}

export function startTransaction(options: TransactionOptions): Sentry.Transaction {
  return Sentry.startTransaction({
    ...options,
    name: options.name,
    op: options.op,
  });
}

export function captureTransactionException(
  transaction: Sentry.Transaction,
  error: Error,
  context: SentryContext
): void {
  setSentryContext(context);
  Sentry.captureException(error);
  transaction.setStatus('error');
}

// ============================================================================
// Critical Transaction Paths (auto-instrumented)
// ============================================================================

// Monitor job creation endpoint
export function instrumentJobCreation(
  req: Request,
  res: Response,
  next: NextFunction
): Sentry.Transaction | null {
  if (req.path === '/api/v1/jobs' && req.method === 'POST') {
    return startTransaction({
      name: 'POST /api/v1/jobs',
      op: 'http.server',
      tags: {
        endpoint: '/api/v1/jobs',
        method: 'POST',
      },
    });
  }
  return null;
}

// Monitor job status transition endpoint
export function instrumentJobTransition(
  req: Request,
  res: Response,
  next: NextFunction
): Sentry.Transaction | null {
  if (req.path.match(/^\/api\/v1\/jobs\/[^\/]+\/status$/) && req.method === 'POST') {
    return startTransaction({
      name: 'POST /api/v1/jobs/:id/status',
      op: 'http.server',
      tags: {
        endpoint: '/api/v1/jobs/:id/status',
        method: 'POST',
        job_id: req.params.id,
      },
    });
  }
  return null;
}

// Monitor calendar operations
export function instrumentCalendarOperation(
  req: Request,
  res: Response,
  next: NextFunction
): Sentry.Transaction | null {
  if (req.path.includes('/availability')) {
    return startTransaction({
      name: `${req.method} /api/v1/workers/:workerId/availability`,
      op: 'http.server',
      tags: {
        method: req.method,
        worker_id: req.params.workerId,
      },
    });
  }
  return null;
}

// ============================================================================
// Alert Threshold Configuration
// ============================================================================

export interface AlertThresholds {
  errorRatePercent: number; // Alert if error rate > X%
  p95LatencyMs: number; // Alert if p95 latency > X ms
  failureCountWindowMs: number; // Check window (e.g., 5 minutes)
  retryCountThreshold: number; // Alert if retry count > X
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  errorRatePercent: 1, // Alert if > 1% errors in window
  p95LatencyMs: 5000, // Alert if p95 latency > 5 seconds
  failureCountWindowMs: 5 * 60 * 1000, // 5 minute window
  retryCountThreshold: 3, // Alert if single request retried > 3 times
};

// ============================================================================
// Alert Rule Registry
// ============================================================================

export interface AlertRule {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threshold: number;
  window_ms: number;
}

export const ALERT_RULES: AlertRule[] = [
  {
    name: 'HighErrorRate',
    description: 'Error rate exceeded 1% over 5 minute window',
    severity: 'high',
    threshold: 1, // percent
    window_ms: 5 * 60 * 1000,
  },
  {
    name: 'HighLatencyP95',
    description: 'p95 request latency exceeded 5 seconds',
    severity: 'medium',
    threshold: 5000, // ms
    window_ms: 5 * 60 * 1000,
  },
  {
    name: 'JobCreationFailures',
    description: 'Job creation endpoint returning > 5% errors',
    severity: 'high',
    threshold: 5, // percent
    window_ms: 5 * 60 * 1000,
  },
  {
    name: 'OptimisticLockConflicts',
    description: 'High rate of optimistic lock failures (409 conflicts)',
    severity: 'medium',
    threshold: 10, // count
    window_ms: 5 * 60 * 1000,
  },
  {
    name: 'OutboxEventFailures',
    description: 'Outbox relay failures after max retries',
    severity: 'critical',
    threshold: 1, // count
    window_ms: 1 * 60 * 1000,
  },
  {
    name: 'CalendarLockViolations',
    description: 'Unusual pattern of calendar lock rule violations',
    severity: 'low',
    threshold: 20, // count
    window_ms: 60 * 60 * 1000, // 1 hour
  },
  {
    name: 'DatabasePoolExhaustion',
    description: 'Database connection pool utilization > 90%',
    severity: 'high',
    threshold: 90, // percent
    window_ms: 1 * 60 * 1000,
  },
];

// ============================================================================
// Debug & Health Checks
// ============================================================================

export function getSentryHealth(): { initialized: boolean; dsn: string | null } {
  const client = Sentry.getCurrentClient();
  return {
    initialized: client !== null,
    dsn: client?.getOptions().dsn || null,
  };
}

export function testSentryCapture(): void {
  logger.info('Testing Sentry capture', { test_event: true });
  Sentry.captureMessage('Test alert from core-platform service', 'info');
}

// ============================================================================
// Utilities
// ============================================================================

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
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
  DEFAULT_ALERT_THRESHOLDS,
};
