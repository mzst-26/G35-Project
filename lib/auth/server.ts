import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { AuthRole, AuthUser, SessionMeResponse } from '@/types/auth';

const DEFAULT_IDENTITY_URL = 'http://localhost:4001';

function getIdentityServiceUrl(): string {
  return process.env.IDENTITY_SERVICE_URL ?? DEFAULT_IDENTITY_URL;
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

export async function getServerSessionUser(): Promise<AuthUser | null> {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${getIdentityServiceUrl()}/api/auth/session/me`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as SessionMeResponse;
    return body.user ?? null;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(loginPath = '/login'): Promise<AuthUser> {
  const user = await getServerSessionUser();
  if (!user) {
    redirect(loginPath);
  }
  return user;
}

export async function requireUserRole(role: AuthRole): Promise<AuthUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== role) {
    if (user.role === 'admin') {
      redirect('/admin/dashboard');
    }
    if (user.role === 'recruiter') {
      redirect('/company/dashboard/home');
    }
    redirect('/trade/dashboard');
  }

  return user;
}
