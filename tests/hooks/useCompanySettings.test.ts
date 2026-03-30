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

  it('loads company profile using companies context, company endpoint, and session profile', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: [{ id: 'company-123' }],
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
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          user: {
            id: 'user-1',
            email: 'recruiter@example.com',
            role: 'recruiter',
            stepUpVerified: true,
            expiresAt: 9999999999,
            fullName: 'Alex Recruiter',
            phoneNumber: '07123456789',
          },
          sessionId: 'session-1',
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
      '/api/core/companies?limit=1&offset=0',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/core/companies/company-123',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/auth/session/me',
      expect.objectContaining({ method: 'GET' }),
    );

    expect(result.current.profile.id).toBe('company-123');
    expect(result.current.profile.companyName).toBe('Infra Build Ltd');
    expect(result.current.profile.city).toBe('Leeds');
    expect(result.current.profile.contactName).toBe('Alex Recruiter');
    expect(result.current.profile.email).toBe('recruiter@example.com');
    expect(result.current.profile.phone).toBe('07123456789');
    expect(result.current.notifications.companyId).toBe('company-123');
  });

  it('saves recruiter user details and company address while keeping company name immutable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          data: [{ id: 'company-123' }],
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
          user: {
            id: 'user-1',
            email: 'recruiter@example.com',
            role: 'recruiter',
            stepUpVerified: true,
            expiresAt: 9999999999,
            fullName: 'Alex Recruiter',
            phoneNumber: '07123456789',
          },
          sessionId: 'session-1',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          user: {
            id: 'user-1',
            email: 'recruiter@example.com',
            role: 'recruiter',
            stepUpVerified: true,
            expiresAt: 9999999999,
            fullName: 'Alex Updated',
            phoneNumber: '07999999999',
          },
          sessionId: 'session-1',
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
      result.current.updateProfileField('contactName', 'Alex Updated');
      result.current.updateProfileField('phone', '07999999999');
      result.current.updateProfileField('addressLine1', '11 River Street');
    });

    await act(async () => {
      await result.current.saveProfile();
    });

    const sessionPatchCall = fetchMock.mock.calls[3];
    expect(sessionPatchCall[0]).toBe('/api/auth/session/me');
    expect(sessionPatchCall[1].method).toBe('PATCH');
    expect(JSON.parse(sessionPatchCall[1].body)).toEqual({
      fullName: 'Alex Updated',
      phoneNumber: '07999999999',
    });

    const companyPatchCall = fetchMock.mock.calls[4];
    expect(companyPatchCall[0]).toBe('/api/core/companies/company-123');
    expect(companyPatchCall[1].method).toBe('PATCH');
    expect(JSON.parse(companyPatchCall[1].body)).toEqual({
      address_line1: '11 River Street',
      address_line2: '',
      city: 'Leeds',
      postcode: 'LS1 4AB',
    });

    expect(result.current.profile.companyName).toBe('Infra Build Ltd');
    expect(result.current.profile.contactName).toBe('Alex Updated');
    expect(result.current.profile.phone).toBe('07999999999');
    expect(result.current.error).toBeNull();
  });

  it('marks notifications as TODO instead of pretending to persist them', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => useCompanySettings());

    await act(async () => {
      await result.current.saveNotifications();
    });

    expect(result.current.error).toContain('partially connected');
  });
});
