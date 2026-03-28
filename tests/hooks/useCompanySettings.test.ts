import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompanySettings } from '@/hooks/useCompanySettings';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

describe('useCompanySettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads company profile using core jobs then company endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: [{ companyId: 'company-123' }],
          meta: { total: 1, limit: 1, offset: 0 },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            id: 'company-123',
            companyName: 'Infra Build Ltd',
            addressLine1: '10 River Street',
            addressLine2: '',
            city: 'Leeds',
            postcode: 'LS1 4AB',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCompanySettings());

    await act(async () => {
      await result.current.loadSettings('');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/core/jobs?limit=1',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/core/companies/company-123',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(result.current.profile.id).toBe('company-123');
    expect(result.current.profile.companyName).toBe('Infra Build Ltd');
    expect(result.current.profile.city).toBe('Leeds');
    expect(result.current.notifications.companyId).toBe('company-123');
  });

  it('saves supported profile fields to core companies endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: [{ companyId: 'company-123' }],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            id: 'company-123',
            companyName: 'Infra Build Ltd',
            addressLine1: '10 River Street',
            addressLine2: '',
            city: 'Leeds',
            postcode: 'LS1 4AB',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: {
            id: 'company-123',
            companyName: 'Infra Build UK',
            addressLine1: '11 River Street',
            addressLine2: '',
            city: 'Leeds',
            postcode: 'LS1 4AB',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCompanySettings());

    await act(async () => {
      await result.current.loadSettings('');
    });

    act(() => {
      result.current.updateProfileField('companyName', 'Infra Build UK');
      result.current.updateProfileField('addressLine1', '11 River Street');
    });

    await act(async () => {
      await result.current.saveProfile();
    });

    const patchCall = fetchMock.mock.calls[2];
    expect(patchCall[0]).toBe('/api/core/companies/company-123');
    expect(patchCall[1].method).toBe('PATCH');
    expect(JSON.parse(patchCall[1].body)).toEqual({
      company_name: 'Infra Build UK',
      address_line1: '11 River Street',
      address_line2: '',
      city: 'Leeds',
      postcode: 'LS1 4AB',
    });

    expect(result.current.profile.companyName).toBe('Infra Build UK');
    expect(result.current.error).toBeNull();
  });

  it('marks notifications as TODO instead of pretending to persist them', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => useCompanySettings());

    await act(async () => {
      await result.current.saveNotifications();
    });

    expect(result.current.error).toContain('not fully connected yet');
  });
});
