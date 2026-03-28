import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplications } from '@/hooks/useApplications';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

const makeApiRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'app-1',
  status: 'pending',
  submittedAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  reviewedAt: null,
  reviewedByAdminUserId: null,
  reviewReason: null,
  requesterFullName: 'Jane Doe',
  requesterEmail: 'jane@example.com',
  requesterPhone: '+441234567890',
  requesterRoleTitle: 'Director',
  companyName: 'Test Corp',
  officeAddressLine1: '1 Main St',
  officeAddressLine2: null,
  officeCity: 'London',
  officePostcode: 'EC1A 1BB',
  companyWebsite: null,
  requestedSeatCount: 5,
  hasInternalApprover: false,
  internalApproverFullName: null,
  internalApproverEmail: null,
  contractSignerSameAsRequester: true,
  contractSignerFullName: null,
  contractSignerEmail: null,
  ...overrides,
});

describe('useApplications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'csrf-token=test-csrf-token',
      configurable: true,
    });
  });

  it('loadApplications fetches from the correct endpoint', async () => {
    const record = makeApiRecord();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [record] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/admin/registration-requests?limit=100&offset=0',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.current.applications).toHaveLength(1);
    expect(result.current.applications[0].id).toBe('app-1');
    expect(result.current.applications[0].applicantName).toBe('Test Corp');
  });

  it('reviewApplication sends POST with decision and reason', async () => {
    const record = makeApiRecord();
    const reviewedRecord = makeApiRecord({ status: 'approved', reviewReason: 'Looks good' });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [record] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reviewedRecord), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reviewedRecord), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.reviewApplication({
        applicationId: 'app-1',
        resolution: 'approved',
        reason: 'Looks good',
      });
    });

    const decisionCall = fetchMock.mock.calls[1];
    expect(decisionCall[0]).toBe('/api/auth/admin/registration-requests/app-1/decision');
    expect(decisionCall[1].method).toBe('POST');

    const body = JSON.parse(decisionCall[1].body as string);
    expect(body.decision).toBe('approve');
    expect(body.reason).toBe('Looks good');
  });

  it('sets error state when loadApplications fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'Not allowed' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to load applications right now.');
    expect(result.current.applications).toHaveLength(0);
  });

  it('exposes requestId in errorEnvelope when loadApplications fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'UPSTREAM_ERROR', message: 'Gateway failed' }), {
        status: 502,
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req-load-failed-123',
        },
      }),
    ));

    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorEnvelope?.requestId).toBe('req-load-failed-123');
    expect(result.current.errorEnvelope?.status).toBe(502);
    expect(result.current.errorEnvelope?.code).toBe('UPSTREAM_ERROR');
  });

  it('sets error state when reviewApplication fails', async () => {
    const record = makeApiRecord();

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [record] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'SERVER_ERROR', message: 'Internal error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.reviewApplication({
          applicationId: 'app-1',
          resolution: 'rejected',
          reason: 'Incomplete',
        });
      } catch (e) {
        thrownError = e as Error;
      }
    });

    expect(thrownError?.message).toBe('APPLICATION_DECISION_FAILED');

    await waitFor(() => {
      expect(result.current.error).toBe('Unable to save your decision right now.');
    });
  });

  it('maps withdrawn status to rejected', async () => {
    const record = makeApiRecord({ status: 'withdrawn' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [record] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.applications[0].status).toBe('rejected');
  });
});
