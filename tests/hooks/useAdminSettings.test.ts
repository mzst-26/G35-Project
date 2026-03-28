import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminSettings } from '@/hooks/useAdminSettings';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

const apiSettings = {
  general: {
    fullName: 'Infra Admin',
    email: 'admin@infra.test',
    phoneNumber: '+447700900123',
    adminLevel: 'super',
  },
  notifications: {
    emailNotifications: true,
    newUserAlerts: true,
    appealAlerts: true,
    supportTicketAlerts: true,
    systemAlerts: true,
  },
  payments: {
    platformFeePercent: 10,
    lateCancellationFee: 50,
    noShowFee: 100,
    lateArrivalFee: 30,
  },
  jobs: {
    maxJobsPerTrade: 5,
    jobCancellationWindowHours: 24,
  },
  users: {
    autoSuspensionThreshold: 3,
  },
};

describe('useAdminSettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads settings from /api/core/admin/settings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(apiSettings), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const { result } = renderHook(() => useAdminSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/core/admin/settings',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.current.settings.general.fullName).toBe('Infra Admin');
  });

  it('patches settings to /api/core/admin/settings on save', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(apiSettings), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.save();
    });

    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toBe('/api/core/admin/settings');
    expect(patchCall[1].method).toBe('PATCH');
  });
});
