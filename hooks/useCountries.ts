'use client';

import { useState, useEffect } from 'react';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';

export interface CountryOption {
  countryName: string;
  countryCode: string;
  callingCode: string | null;
}

export function useCountries() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCountries() {
      try {
        const res = await fetch('/api/reference/countries', { signal: controller.signal });
        if (!res.ok) {
          captureFrontendMessage('Countries API returned non-2xx', {
            flow: 'recruiter_registration',
            endpoint: '/api/reference/countries',
            action: 'load_countries',
            role: 'anonymous',
            extra: { status: res.status },
          });
          throw new Error('Unable to load countries right now.');
        }
        const data = (await res.json()) as { items?: CountryOption[] };
        if (!controller.signal.aborted) {
          setCountries(data.items ?? []);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const isAbort = err instanceof Error && err.name === 'AbortError';
          const isOurThrow = err instanceof Error && err.message === 'Unable to load countries right now.';
          if (!isAbort && !isOurThrow) {
            captureFrontendError(err, {
              flow: 'recruiter_registration',
              endpoint: '/api/reference/countries',
              action: 'load_countries',
              role: 'anonymous',
            });
          }
          setError(err instanceof Error ? err.message : 'Unable to load countries right now.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchCountries();
    return () => { controller.abort(); };
  }, []);

  return { countries, isLoading, error };
}
