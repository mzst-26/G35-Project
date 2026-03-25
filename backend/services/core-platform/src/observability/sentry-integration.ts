import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import * as Sentry from "@sentry/node";

type SentrySeverity = "info" | "warning" | "error";

export type SentryContext = {
	userId?: string;
	userEmail?: string;
	userRole?: string;
	jobId?: string;
	workerId?: string;
	companyId?: string;
	availabilityId?: string;
	fromStatus?: string;
	toStatus?: string;
	adminId?: string;
	action?: string;
	targetId?: string;
	idempotencyKey?: string;
	requestId?: string;
	retryCount?: number;
	errorCode?: string;
	errorReason?: string;
	eventType?: string;
};

export type AlertRule = {
	name: string;
	severity: "low" | "medium" | "high" | "critical";
	threshold: number;
	window_ms: number;
};

export const ALERT_RULES: AlertRule[] = [
	{ name: "HighErrorRate", severity: "high", threshold: 1, window_ms: 5 * 60 * 1000 },
	{ name: "JobCreationFailures", severity: "high", threshold: 10, window_ms: 5 * 60 * 1000 },
	{ name: "OutboxEventFailures", severity: "critical", threshold: 5, window_ms: 5 * 60 * 1000 },
	{ name: "OptimisticLockConflicts", severity: "medium", threshold: 50, window_ms: 10 * 60 * 1000 },
	{ name: "CalendarLockViolations", severity: "medium", threshold: 20, window_ms: 60 * 60 * 1000 },
	{ name: "DatabasePoolExhaustion", severity: "high", threshold: 90, window_ms: 5 * 60 * 1000 },
];

function applyTagsAndContext(context: SentryContext): void {
	const tags: Record<string, string | number | boolean> = {};

	if (context.userId) tags.user_id = context.userId;
	if (context.jobId) tags.job_id = context.jobId;
	if (context.workerId) tags.worker_id = context.workerId;
	if (context.companyId) tags.company_id = context.companyId;
	if (context.availabilityId) tags.availability_id = context.availabilityId;
	if (context.fromStatus) tags.from_status = context.fromStatus;
	if (context.toStatus) tags.to_status = context.toStatus;
	if (context.adminId) tags.admin_id = context.adminId;
	if (context.action) tags.action = context.action;
	if (context.targetId) tags.target_id = context.targetId;
	if (context.eventType) tags.event_type = context.eventType;
	if (context.errorCode) tags.error_code = context.errorCode;
	if (context.errorReason) tags.error_reason = context.errorReason;
	if (typeof context.retryCount === "number") tags.retry_count = context.retryCount;

	if (Object.keys(tags).length > 0) {
		Sentry.setTags(tags);
	}

	Sentry.setContext("business_context", {
		idempotency_key: context.idempotencyKey,
		request_id: context.requestId,
		retry_count: context.retryCount,
	});
}

export function setSentryContext(context: SentryContext): void {
	if (context.userId || context.userEmail || context.userRole) {
		Sentry.setUser({
			id: context.userId,
			email: context.userEmail,
			username: context.userRole,
		});
	}

	applyTagsAndContext(context);
}

export function clearSentryContext(): void {
	Sentry.setUser(null);
	(Sentry as unknown as { clearTags?: () => void }).clearTags?.();
}

export function captureBusinessError(message: string, context: SentryContext = {}, severity: SentrySeverity = "error"): void {
	setSentryContext(context);
	Sentry.captureMessage(message, severity);
}

export function captureException(error: unknown, context: SentryContext = {}): void {
	setSentryContext(context);
	Sentry.captureException(error);
}

export function captureValidationError(fieldName: string, reason: string, context: SentryContext = {}): void {
	captureBusinessError(`Validation error on ${fieldName}: ${reason}`, context, "warning");
}

export function captureAuthError(reason: string, context: SentryContext = {}): void {
	captureBusinessError(`Authentication error: ${reason}`, context, "warning");
}

export function captureAuthzError(requiredPermission: string, context: SentryContext = {}): void {
	captureBusinessError(`Authorization denied. Required permission: ${requiredPermission}`, context, "warning");
}

export function captureOptimisticLockFailure(context: SentryContext = {}): void {
	setSentryContext(context);
	Sentry.setTags({ retryable: true });
	Sentry.captureMessage("Optimistic lock conflict detected", "info");
}

export function captureIdempotencyViolation(key: string, context: SentryContext = {}): void {
	captureBusinessError(`Idempotency key violation detected: ${key}`, context, "info");
}

export function captureStateMachineViolation(fromStatus: string, toStatus: string, reason: string, context: SentryContext = {}): void {
	captureBusinessError(`Invalid state transition: ${fromStatus} → ${toStatus} (${reason})`, context, "warning");
}

export function captureCalendarLockViolation(workerId: string, jobId: string, context: SentryContext = {}): void {
	captureBusinessError(
		"Calendar availability locked within 7-day window",
		{ ...context, workerId, jobId },
		"info",
	);
}

export function captureAdminOverride(adminId: string, action: string, targetId: string, context: SentryContext = {}): void {
	captureBusinessError(`Admin override: ${action} on ${targetId}`, { ...context, adminId, action, targetId }, "info");
}

export function captureOutboxEventFailure(
	eventType: string,
	reason: string,
	retryCount: number,
	context: SentryContext = {},
): void {
	const retryable = retryCount < 3;
	setSentryContext({ ...context, eventType, retryCount, errorReason: reason });
	Sentry.setTags({ retryable });
	Sentry.captureMessage(`Outbox event publish failed: ${eventType} (${reason})`, "error");
}

type RequestWithContext = Request & {
	requestId?: string;
	userId?: string;
	userRole?: string;
};

export function sentryContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
	const request = req as RequestWithContext;
	request.requestId = request.headers["x-request-id"]?.toString() ?? crypto.randomUUID();

	setSentryContext({
		requestId: request.requestId,
		userId: request.userId,
		userRole: request.userRole,
	});

	next();
}

type TransactionInput = {
	name: string;
	op: string;
	tags?: Record<string, string>;
};

export function startTransaction(input: TransactionInput): unknown {
	const start = (Sentry as unknown as { startTransaction?: (ctx: TransactionInput) => unknown }).startTransaction;
	if (!start) {
		return { setStatus: () => undefined };
	}
	return start(input);
}
