import type { NextFunction, Request, Response } from "express";

type MetricsSummary = Record<string, number>;

class InMemoryMetrics {
	private counters = new Map<string, number>();

	private increment(name: string, value = 1): void {
		const current = this.counters.get(name) ?? 0;
		this.counters.set(name, current + value);
	}

	reset(): void {
		this.counters.clear();
	}

	getSummary(): MetricsSummary {
		return Object.fromEntries(this.counters.entries());
	}

	recordJobCreated(_companyId: string, count = 1): void {
		this.increment("job.created", count);
	}

	recordJobStatusTransition(_jobId: string, _from: string, _to: string, _success: boolean): void {
		this.increment("job.status.transitioned");
	}

	recordJobTransitionDenied(_jobId: string, _from: string, _to: string, _reason: string): void {
		this.increment("job.status.transition.denied");
	}

	recordCalendarAvailabilityCreated(_workerId: string): void {
		this.increment("calendar.availability.created");
	}

	recordCalendarAvailabilityDeleted(_workerId: string, _withinLockWindow: boolean): void {
		this.increment("calendar.availability.deleted");
	}

	recordCalendarLockViolationAttempt(_workerId: string, _jobId: string): void {
		this.increment("calendar.availability.lock_violation");
	}

	recordAdminOverrideAction(_adminId: string, _action: string, _targetId: string): void {
		this.increment("admin.override.used");
	}

	recordCompanyStatusChange(_companyId: string, _from: string, _to: string): void {
		this.increment("company.status.changed");
	}

	recordWorkerVerificationChange(_workerId: string, _status: string): void {
		this.increment("worker.verification.changed");
	}

	recordOutboxEventPublished(_eventType: string, _success: boolean, _retryCount: number): void {
		this.increment("outbox.event.published");
	}

	recordCommandError(eventType: string, success: boolean): void {
		this.recordOutboxEventPublished(eventType, success, 0);
	}

	recordIdempotencyKeyHit(_route: string, _hit: boolean): void {
		this.increment("idempotency.key.hit");
	}

	recordHttpRequestDuration(_method: string, _path: string, _statusCode: number, durationMs: number): void {
		this.increment("http.request.duration_ms", durationMs);
	}

	recordDatabaseQueryDuration(_query: string, durationMs: number, _success: boolean): void {
		this.increment("db.query.duration_ms", durationMs);
	}

	recordConcurrentWrite(_resolved: boolean, _resolution: string): void {
		this.increment("concurrent.write.resolved");
	}

	recordValidationError(_route: string, _field: string, _reason: string): void {
		this.increment("validation.error");
	}

	recordAuthenticationFailure(_reason: string): void {
		this.increment("authentication.failure");
	}

	recordAuthorizationFailure(_permission: string, _role: string): void {
		this.increment("authorization.failure");
	}

	recordRateLimitExceeded(_limitName: string, _userId?: string): void {
		this.increment("rate_limit.exceeded");
	}

	recordServiceError(_errorType: string, _route: string, _statusCode: number): void {
		this.increment("service.error");
	}

	recordMemoryUsage(): void {
		const usage = process.memoryUsage();
		this.increment("memory.heap_used_mb", usage.heapUsed / (1024 * 1024));
		this.increment("memory.heap_total_mb", usage.heapTotal / (1024 * 1024));
		this.increment("memory.external_mb", usage.external / (1024 * 1024));
	}

	recordActiveConnections(count: number): void {
		this.increment("http.connections.active", count);
	}

	recordDatabasePoolUtilization(active: number, total: number): void {
		if (total <= 0) {
			this.increment("db.pool.utilization_percent", 0);
			return;
		}
		this.increment("db.pool.utilization_percent", (active / total) * 100);
	}
}

export const metrics = new InMemoryMetrics();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
	const startedAt = Date.now();
	const originalEnd = res.end.bind(res);

	res.end = ((...args: Parameters<Response["end"]>) => {
		const durationMs = Date.now() - startedAt;
		metrics.recordHttpRequestDuration(req.method, req.path, res.statusCode, durationMs);
		return originalEnd(...args);
	}) as Response["end"];

	next();
}

export function exportPrometheus(): string {
	const summary = metrics.getSummary();
	const lines: string[] = [];
	for (const [name, value] of Object.entries(summary)) {
		lines.push(`# TYPE ${name} counter`);
		lines.push(`${name} ${value}`);
	}
	return lines.join("\n");
}
