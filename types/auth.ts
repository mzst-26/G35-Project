export type AuthRole = 'admin' | 'recruiter' | 'trade';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  stepUpVerified: boolean;
  expiresAt: number;
}

export interface AuthSession {
  user: AuthUser;
  sessionId?: string;
}

export interface AuthIssue {
  field: string;
  message: string;
}

export interface AuthErrorPayload {
  code: string;
  message: string;
  issues?: AuthIssue[];
}

export interface RequestOtpPayload {
  email: string;
}

export interface RequestOtpResponse {
  messageId: string;
}

export interface VerifyOtpPayload {
  email: string;
  token: string;
}

export interface VerifyOtpResponse {
  user: AuthUser;
  sessionId: string;
  mfaSetupRequired?: false;
}

/** Returned when an admin has no TOTP factor enrolled yet. */
export interface VerifyOtpMfaSetupResponse {
  mfaSetupRequired: true;
}

export type VerifyOtpOutcome = VerifyOtpResponse | VerifyOtpMfaSetupResponse;

export interface MfaEnrollResponse {
  factorId: string;
  totpUri: string;
  totpSecret: string;
}

export interface MfaChallengeResponse {
  challengeId: string;
  expiresAt: string;
}

export interface MfaVerifyResponse {
  verified: boolean;
}

export interface MfaCompleteAdminLoginResponse {
  user: AuthUser;
  sessionId: string;
}

export interface SessionMeResponse {
  user: AuthUser;
}

export interface RefreshSessionResponse {
  expiresAt: number;
}

export interface LogoutPayload {
  sessionId: string;
}
