import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterRecruiter from '@/app/login/register/recruiter/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

describe('Recruiter registration form', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
      writable: true,
      configurable: true,
    });

    window.localStorage.clear();
    pushMock.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/api/reference/countries')) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [
            { countryName: 'United Kingdom', countryCode: 'GB', callingCode: '+44' },
            { countryName: 'Ireland', countryCode: 'IE', callingCode: '+353' },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
      }

      return Promise.resolve(new Response(JSON.stringify({ status: 'pending' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }));
    }));
  });

  const completeStageOne = async () => {
    fireEvent.click(screen.getByLabelText(/^No$/i));
    fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Northline Build Ltd' } });
    fireEvent.change(screen.getByLabelText(/Origin Country/i), { target: { value: 'Ire' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Ireland$/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^Ireland$/i }));
    fireEvent.change(screen.getByLabelText(/Applicant Full Name/i), { target: { value: 'Jamie Carter' } });
    fireEvent.change(screen.getByLabelText(/Applicant Email/i), { target: { value: 'jamie@example.com' } });
    fireEvent.change(screen.getByLabelText(/Applicant Role Title/i), { target: { value: 'Director' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '7700900123' } });

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
  };

  const completeStageTwoRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/^Company address line 1/i), { target: { value: '10 Fleet Street' } });
    fireEvent.change(screen.getByLabelText(/^Company city/i), { target: { value: 'London' } });
    fireEvent.change(screen.getByLabelText(/^Company postcode/i), { target: { value: 'EC4Y 1AA' } });
  };

  const approvePolicies = () => {
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'recruiter-policy-approved', acceptedAt: '2026-03-14T18:30:00.000Z' },
      }));
    });
  };

  it('renders internal approver fields when toggled on', async () => {
    render(<RegisterRecruiter />);

    await completeStageOne();

    fireEvent.click(screen.getByLabelText(/No — I need to nominate someone else to approve/i));

    expect(screen.getByLabelText(/Internal Approver Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Internal Approver Email/i)).toBeInTheDocument();
  });

  it('does not show contract signer controls', async () => {
    render(<RegisterRecruiter />);

    await completeStageOne();

    expect(screen.queryByText(/Contract Signer/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Contract signer is the applicant/i)).not.toBeInTheDocument();
  });

  it('does not submit when user clicks next', async () => {
    render(<RegisterRecruiter />);

    await completeStageOne();

    expect(fetch).not.toHaveBeenCalledWith(
      '/api/auth/recruiter-registration',
      expect.anything(),
    );
    expect(screen.getByLabelText(/No — I need to nominate someone else to approve/i)).toBeInTheDocument();
    expect(screen.queryByText(/Unable to submit your request at this time/i)).not.toBeInTheDocument();
  });

  it('submits payload to API and shows deterministic status message', async () => {
    render(<RegisterRecruiter />);

    await completeStageOne();
    completeStageTwoRequiredFields();

    const submitButton = screen.getByRole('button', { name: /Submit Request/i });
    expect(submitButton).toBeDisabled();

    approvePolicies();
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login/register/recruiter/confirmation');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/recruiter-registration',
      expect.objectContaining({ method: 'POST' }),
    );

    expect(window.localStorage.getItem('recruiter-registration-draft-v1')).toBeNull();
  });

  it('autosaves draft after delay and restores it on remount', async () => {
    const { unmount } = render(<RegisterRecruiter />);

    fireEvent.change(screen.getByLabelText(/Applicant Full Name/i), { target: { value: 'Draft Person Ltd' } });

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const draftRaw = window.localStorage.getItem('recruiter-registration-draft-v1');
    expect(draftRaw).toBeTruthy();
    expect(draftRaw).toContain('Draft Person Ltd');

    unmount();
    render(<RegisterRecruiter />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Applicant Full Name/i)).toHaveValue('Draft Person Ltd');
    });
  });
});
