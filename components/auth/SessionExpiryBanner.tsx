'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';

const LAST_24_HOURS_SECONDS = 24 * 60 * 60;

export function SessionExpiryBanner() {
  const { user, isLoading } = useAuth();

  const message = useMemo(() => {
    if (!user?.expiresAt) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const remainingSeconds = user.expiresAt - nowSeconds;

    if (remainingSeconds <= 0 || remainingSeconds > LAST_24_HOURS_SECONDS) {
      return null;
    }

    const remainingHours = Math.max(1, Math.ceil(remainingSeconds / 3600));
    return `Your session expires in about ${remainingHours} hour${remainingHours === 1 ? '' : 's'}. Please save your work and log in again before the 30-day session window ends.`;
  }, [user]);

  if (isLoading || !message) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[90] w-full bg-amber-100 border-b border-amber-300 text-amber-900">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4" />
        <p>{message}</p>
      </div>
    </div>
  );
}
