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
