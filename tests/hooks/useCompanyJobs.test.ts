import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompanyJobs } from '@/hooks/useCompanyJobs';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

describe('useCompanyJobs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads jobs from /api/core/jobs and maps stats', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          {
            id: 'job-1',
            title: 'Office Rewire',
            trade: 'Electrician',
            status: 'in_progress',
            workersNeeded: 2,
            startAt: '2026-04-01T09:00:00Z',
            location: 'London',
          },
          {
            id: 'job-2',
            title: 'Pipe Maintenance',
            trade: 'Plumber',
            status: 'allocated',
            workersNeeded: 1,
            startAt: '2026-04-04T09:00:00Z',
            location: 'Leeds',
          },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const { result } = renderHook(() => useCompanyJobs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/core/jobs?limit=20',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.jobs[0].status).toBe('in-progress');
    expect(result.current.stats.inProgress).toBe(1);
    expect(result.current.stats.allocated).toBe(1);
  });

  it('exposes error envelope when request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'UPSTREAM_ERROR', message: 'Gateway failed' }), {
        status: 502,
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req-company-jobs-failed-1',
        },
      }),
    ));

    const { result } = renderHook(() => useCompanyJobs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorEnvelope?.code).toBe('UPSTREAM_ERROR');
    expect(result.current.errorEnvelope?.requestId).toBe('req-company-jobs-failed-1');
  });
});
