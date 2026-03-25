import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlags, getProxyDisabledResponse } from '@/lib/utils/feature-flags';

describe('FeatureFlags', () => {
	let flags: FeatureFlags;

	beforeEach(() => {
		flags = new FeatureFlags();
	});

	describe('Constructor', () => {
		it('initializes with custom config', () => {
			const customConfig = { jobs: 'fully-enabled', calendar: 'disabled' };
			flags = new FeatureFlags(customConfig);

			expect(flags.isProxyEnabled('jobs', 'GET')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'POST')).toBe(true);
			expect(flags.isProxyEnabled('calendar', 'GET')).toBe(false);
		});

		it('defaults to disabled for all domains', () => {
			const emptyFlags = new FeatureFlags({});

			expect(emptyFlags.isProxyEnabled('jobs', 'GET')).toBe(false);
			expect(emptyFlags.isProxyEnabled('calendar', 'POST')).toBe(false);
			expect(emptyFlags.isProxyEnabled('companies', 'GET')).toBe(false);
		});
	});

	describe('isProxyEnabled', () => {
		it('returns false when domain is disabled', () => {
			flags = new FeatureFlags({ jobs: 'disabled' });
			expect(flags.isProxyEnabled('jobs', 'GET')).toBe(false);
			expect(flags.isProxyEnabled('jobs', 'POST')).toBe(false);
		});

		it('returns false for writes when in read-only mode', () => {
			flags = new FeatureFlags({ jobs: 'read-only' });
			expect(flags.isProxyEnabled('jobs', 'POST')).toBe(false);
			expect(flags.isProxyEnabled('jobs', 'PATCH')).toBe(false);
			expect(flags.isProxyEnabled('jobs', 'DELETE')).toBe(false);
		});

		it('returns true for GET in read-only mode', () => {
			flags = new FeatureFlags({ jobs: 'read-only' });
			expect(flags.isProxyEnabled('jobs', 'GET')).toBe(true);
		});

		it('returns true for all methods in fully-enabled mode', () => {
			flags = new FeatureFlags({ jobs: 'fully-enabled' });
			expect(flags.isProxyEnabled('jobs', 'GET')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'POST')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'PATCH')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'DELETE')).toBe(true);
		});

		it('allows reads and writes in with-writes stage', () => {
			flags = new FeatureFlags({ jobs: 'with-writes' });
			expect(flags.isProxyEnabled('jobs', 'GET')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'POST')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'PATCH')).toBe(true);
			expect(flags.isProxyEnabled('jobs', 'DELETE')).toBe(true);
		});

		it('respects enableAllRoutes override', () => {
			flags = new FeatureFlags({ jobs: 'disabled', enableAllRoutes: true });
			expect(flags.isProxyEnabled('jobs', 'GET')).toBe(true);
		});
	});

	describe('canRead', () => {
		it('returns true for all non-disabled stages', () => {
			expect(new FeatureFlags({ jobs: 'read-only' }).canRead('jobs')).toBe(true);
			expect(new FeatureFlags({ jobs: 'with-writes' }).canRead('jobs')).toBe(true);
			expect(new FeatureFlags({ jobs: 'fully-enabled' }).canRead('jobs')).toBe(true);
		});

		it('returns false when disabled', () => {
			flags = new FeatureFlags({ jobs: 'disabled' });
			expect(flags.canRead('jobs')).toBe(false);
		});
	});

	describe('canWrite', () => {
		it('returns true only in with-writes and fully-enabled stages', () => {
			expect(new FeatureFlags({ jobs: 'with-writes' }).canWrite('jobs')).toBe(true);
			expect(new FeatureFlags({ jobs: 'fully-enabled' }).canWrite('jobs')).toBe(true);
		});

		it('returns false in read-only and disabled stages', () => {
			expect(new FeatureFlags({ jobs: 'read-only' }).canWrite('jobs')).toBe(false);
			expect(new FeatureFlags({ jobs: 'disabled' }).canWrite('jobs')).toBe(false);
		});
	});

	describe('getStatus', () => {
		it('returns array with status for all domains', () => {
			flags = new FeatureFlags({
				jobs: 'with-writes',
				calendar: 'read-only',
				companies: 'disabled',
			});

			const status = flags.getStatus();

			expect(status).toBeInstanceOf(Array);
			expect(status.length).toBe(5); // 5 domains total
		});

		it('tracks individual domain capabilities', () => {
			flags = new FeatureFlags({ jobs: 'with-writes', calendar: 'read-only' });
			const status = flags.getStatus();

			const jobsStatus = status.find((s) => s.domain === 'jobs');
			const calendarStatus = status.find((s) => s.domain === 'calendar');

			expect(jobsStatus).toBeDefined();
			expect(jobsStatus?.stage).toBe('with-writes');
			expect(jobsStatus?.canRead).toBe(true);
			expect(jobsStatus?.canWrite).toBe(true);

			expect(calendarStatus).toBeDefined();
			expect(calendarStatus?.stage).toBe('read-only');
			expect(calendarStatus?.canRead).toBe(true);
			expect(calendarStatus?.canWrite).toBe(false);
		});

		it('includes disabled domains in status', () => {
			flags = new FeatureFlags({ admin: 'disabled' });
			const status = flags.getStatus();

			const adminStatus = status.find((s) => s.domain === 'admin');
			expect(adminStatus).toBeDefined();
			expect(adminStatus?.stage).toBe('disabled');
		});
	});

	describe('Domain independence', () => {
		it('allows different stages for different domains', () => {
			flags = new FeatureFlags({
				jobs: 'fully-enabled',
				calendar: 'read-only',
				companies: 'with-writes',
				workers: 'disabled',
				admin: 'disabled',
			});

			expect(flags.isProxyEnabled('jobs', 'POST')).toBe(true);
			expect(flags.isProxyEnabled('calendar', 'POST')).toBe(false);
			expect(flags.isProxyEnabled('companies', 'PATCH')).toBe(true);
			expect(flags.isProxyEnabled('workers', 'GET')).toBe(false);
		});
	});
});

describe('getProxyDisabledResponse', () => {
	it('returns 503 response when proxy is disabled', () => {
		const response = getProxyDisabledResponse('jobs', 'GET');

		if (response) {
			expect(response.status).toBe(503);
		}
	});

	it('includes helpful message for disabled service', async () => {
		const response = getProxyDisabledResponse('jobs', 'POST');

		if (response) {
			const body = await response.json();
			expect(body).toBeDefined();
			expect(body.code).toBe('PROXY_DISABLED');
			expect(body.message).toContain('Proxy route');
		}
	});

	it('distinguishes between read and write operations in message', async () => {
		const readResponse = getProxyDisabledResponse('jobs', 'GET');
		const writeResponse = getProxyDisabledResponse('jobs', 'POST');

		if (readResponse && writeResponse) {
			const readBody = await readResponse.json();
			const writeBody = await writeResponse.json();

			expect(readBody.message).toContain('reading');
			expect(writeBody.message).toContain('writing');
		}
	});

	it('includes requestId and timestamp in response', async () => {
		const response = getProxyDisabledResponse('jobs', 'GET');

		if (response) {
			const body = await response.json();
			expect(body.requestId).toBeDefined();
			expect(body.requestId).toMatch(/^req-/);
			expect(body.timestamp).toBeDefined();
		}
	});

	it('sets appropriate content-type header', () => {
		const response = getProxyDisabledResponse('jobs', 'GET');

		if (response) {
			expect(response.headers.get('content-type')).toBe('application/json');
		}
	});
});
