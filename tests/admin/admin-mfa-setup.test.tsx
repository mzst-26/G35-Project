import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminMfaSetupPage from '@/app/admin/mfa/setup/page';

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

const mfaEnrollMock = vi.fn();
const mfaChallengeMock = vi.fn();
const mfaVerifyMock = vi.fn();
const mfaCompleteAdminLoginMock = vi.fn();

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
    mfaEnroll: (...args: unknown[]) => mfaEnrollMock(...args),
    mfaChallenge: (...args: unknown[]) => mfaChallengeMock(...args),
    mfaVerify: (...args: unknown[]) => mfaVerifyMock(...args),
    mfaCompleteAdminLogin: (...args: unknown[]) => mfaCompleteAdminLoginMock(...args),
    AuthApiError,
  };
});

vi.mock('qrcode', () => ({
  toCanvas: vi.fn(),
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureFrontendError: vi.fn(),
  captureFrontendMessage: vi.fn(),
}));

describe('AdminMfaSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state on mount', () => {
    mfaEnrollMock.mockReturnValue(new Promise(() => {}));

    render(<AdminMfaSetupPage />);

    expect(screen.getByText(/Preparing authenticator setup/i)).toBeInTheDocument();
  });

  it('shows QR secret after enrollment', async () => {
    mfaEnrollMock.mockResolvedValueOnce({
      factorId: 'f1',
      totpUri: 'otpauth://totp/Test?secret=ABCDEFGH',
      totpSecret: 'ABCDEFGH',
    });

    render(<AdminMfaSetupPage />);

    await waitFor(() => {
      expect(screen.getByText('ABCDEFGH')).toBeInTheDocument();
    });

    expect(screen.getByText(/Scan the QR code/i)).toBeInTheDocument();
  });

  it('shows verify form after clicking continue', async () => {
    mfaEnrollMock.mockResolvedValueOnce({
      factorId: 'f1',
      totpUri: 'otpauth://totp/Test?secret=ABCDEFGH',
      totpSecret: 'ABCDEFGH',
    });
    mfaChallengeMock.mockResolvedValueOnce({
      challengeId: 'c1',
      expiresAt: '2026-12-31T23:59:59Z',
    });

    render(<AdminMfaSetupPage />);

    await waitFor(() => {
      expect(screen.getByText('ABCDEFGH')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Authenticator code/i)).toBeInTheDocument();
    });
  });

  it('redirects to dashboard on successful verification', async () => {
    mfaEnrollMock.mockResolvedValueOnce({
      factorId: 'f1',
      totpUri: 'otpauth://totp/Test?secret=SECRET123',
      totpSecret: 'SECRET123',
    });
    mfaChallengeMock.mockResolvedValueOnce({
      challengeId: 'c1',
      expiresAt: '2026-12-31T23:59:59Z',
    });
    mfaVerifyMock.mockResolvedValueOnce({ verified: true });
    mfaCompleteAdminLoginMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'admin@example.com', role: 'admin', stepUpVerified: true, expiresAt: 1735689600 },
      sessionId: 's1',
    });
    refreshUserMock.mockResolvedValueOnce(undefined);

    render(<AdminMfaSetupPage />);

    await waitFor(() => {
      expect(screen.getByText('SECRET123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Authenticator code/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Authenticator code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm and sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('shows error state when enrollment fails', async () => {
    const mod = await import('@/lib/auth/client');
    mfaEnrollMock.mockRejectedValueOnce(new mod.AuthApiError('Session expired', 401));

    render(<AdminMfaSetupPage />);

    await waitFor(() => {
      expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Back to login/i })).toBeInTheDocument();
  });
});
