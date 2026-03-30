import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTradeSettings } from '@/hooks/useTradeSettings';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

describe('useTradeSettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads worker profile from core workers endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        data: {
          id: 'worker-456',
          userId: 'user-789',
          tradeId: 'trade_123',
          qualifications: 'Level 4 Electrician',
          verifiedStatus: 'verified',
          addressLine1: '20 Elm Road',
          addressLine2: 'Unit 5',
          city: 'Manchester',
          locationLng: -2.2426,
          locationLat: 53.4808,
          bio: 'Experienced electrician with 10 years background',
          avatarUrl: null,
          hourlyRate: 45.0,
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTradeSettings());

    await act(async () => {
      await result.current.loadSettings('worker-456');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/workers/worker-456',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(result.current.profile.id).toBe('worker-456');
    expect(result.current.profile.companyName).toBe('Experienced electrician with 10 years background');
    expect(result.current.profile.addressLine1).toBe('20 Elm Road');
    expect(result.current.profile.city).toBe('Manchester');
    expect(result.current.notifications.companyId).toBe('worker-456');
  });

  it('saves supported profile fields to core workers endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            id: 'worker-456',
            userId: 'user-789',
            tradeId: 'trade_123',
            qualifications: 'Level 4 Electrician',
            verifiedStatus: 'verified',
            addressLine1: '20 Elm Road',
            addressLine2: 'Unit 5',
            city: 'Manchester',
            locationLng: -2.2426,
            locationLat: 53.4808,
            bio: 'Experienced electrician',
            avatarUrl: null,
            hourlyRate: 45.0,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            id: 'worker-456',
            userId: 'user-789',
            tradeId: 'trade_123',
            qualifications: 'Level 4 Electrician',
            verifiedStatus: 'verified',
            addressLine1: '21 Elm Road',
            addressLine2: 'Unit 5',
            city: 'Manchester',
            locationLng: -2.2426,
            locationLat: 53.4808,
            bio: 'Senior electrician with 10 years background',
            avatarUrl: null,
            hourlyRate: 45.0,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTradeSettings());

    await act(async () => {
      await result.current.loadSettings('worker-456');
    });

    act(() => {
      result.current.updateProfileField('companyName', 'Senior electrician with 10 years background');
      result.current.updateProfileField('addressLine1', '21 Elm Road');
    });

    await act(async () => {
      await result.current.saveProfile();
    });

    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toBe('/api/core/workers/worker-456');
    expect(patchCall[1].method).toBe('PATCH');
    expect(JSON.parse(patchCall[1].body)).toEqual({
      bio: 'Senior electrician with 10 years background',
      qualifications: null,
      address_line1: '21 Elm Road',
      address_line2: 'Unit 5',
      city: 'Manchester',
    });

    expect(result.current.profile.companyName).toBe('Senior electrician with 10 years background');
    expect(result.current.error).toBeNull();
  });

  it('marks notifications as TODO instead of pretending to persist them', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => useTradeSettings());

    await act(async () => {
      await result.current.saveNotifications();
    });

    expect(result.current.error).toContain('not fully connected yet');
  });
});
