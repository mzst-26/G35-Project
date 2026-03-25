'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AuthApiError, getSessionMe } from '@/lib/auth/client';
import type { AuthUser } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  sessionId: string | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await getSessionMe();
      setUser(session.user);
      setSessionId(session.sessionId ?? null);
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        setUser(null);
        setSessionId(null);
      } else {
        setUser(null);
        setSessionId(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    setSessionId(null);
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      sessionId,
      isLoading,
      refreshUser,
      clearUser,
    }),
    [clearUser, isLoading, refreshUser, sessionId, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
