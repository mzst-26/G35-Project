import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminLoginPage from '@/app/login/adminLogin/page';

const pushMock = vi.fn();
const refreshUserMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    refreshUser: refreshUserMock,
  }),
}));

const requestOtpMock = vi.fn();
const verifyOtpMock = vi.fn();

vi.mock('@/lib/auth/client', async () => {
  class AuthApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, status: number, code = 'UNKNOWN_ERROR') {
      super(message);
      this.name = 'AuthApiError';
      this.status = status;
      this.code = code;
    }
  }

  return {
    requestOtp: (...args: unknown[]) => requestOtpMock(...args),
    verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
    AuthApiError,
  };
});

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

async function getAuthApiError() {
  const mod = await import('@/lib/auth/client');
  return mod.AuthApiError;
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input and "Admin Sign In" button', () => {
    render(<AdminLoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin Sign In/i })).toBeInTheDocument();
  });

  it('shows sign-in code input after OTP request', async () => {
    requestOtpMock.mockResolvedValueOnce({ messageId: 'm1' });

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Admin Sign In/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/sign-in code/i)).toBeInTheDocument();
    });
  });

  it('redirects to /admin/mfa/setup when mfaSetupRequired is true', async () => {
    requestOtpMock.mockResolvedValueOnce({ messageId: 'm1' });
    verifyOtpMock.mockResolvedValueOnce({ mfaSetupRequired: true });

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Admin Sign In/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/sign-in code/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/sign-in code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin/mfa/setup');
    });
  });

  it('shows error when user role is not admin', async () => {
    requestOtpMock.mockResolvedValueOnce({ messageId: 'm1' });
    verifyOtpMock.mockResolvedValueOnce({
      mfaSetupRequired: false,
      user: { id: 'u1', email: 'user@example.com', role: 'trade', stepUpVerified: false, expiresAt: 1735689600 },
      sessionId: 's1',
    });

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Admin Sign In/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/sign-in code/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/sign-in code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() => {
      expect(screen.getByText(/not an admin account/i)).toBeInTheDocument();
    });
  });

  it('shows error message on AuthApiError during OTP request', async () => {
    const AuthApiError = await getAuthApiError();
    requestOtpMock.mockRejectedValueOnce(new AuthApiError('Rate limit exceeded', 429));

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Admin Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  it('shows error message on AuthApiError during OTP verify', async () => {
    const AuthApiError = await getAuthApiError();
    requestOtpMock.mockResolvedValueOnce({ messageId: 'm1' });
    verifyOtpMock.mockRejectedValueOnce(new AuthApiError('Invalid code', 401));

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Admin Sign In/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/sign-in code/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/sign-in code/i), { target: { value: '999999' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
    });
  });

  it('redirects to /admin/dashboard on successful admin login', async () => {
    requestOtpMock.mockResolvedValueOnce({ messageId: 'm1' });
    verifyOtpMock.mockResolvedValueOnce({
      mfaSetupRequired: false,
      user: { id: 'u1', email: 'admin@example.com', role: 'admin', stepUpVerified: true, expiresAt: 1735689600 },
      sessionId: 's1',
    });
    refreshUserMock.mockResolvedValueOnce(undefined);

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Admin Sign In/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/sign-in code/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/sign-in code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin/dashboard');
    });
  });
});
