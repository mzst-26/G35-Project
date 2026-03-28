'use client';

import { useState, useEffect } from 'react';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { HookErrorEnvelope, parseJsonOrThrowEnvelope, toHookApiError } from '@/lib/core/error-envelope';

export interface CountryOption {
  countryName: string;
  countryCode: string;
  callingCode: string | null;
}

export function useCountries() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCountries() {
      try {
        const res = await fetch('/api/reference/countries', { signal: controller.signal });
        const data = await parseJsonOrThrowEnvelope<{ items?: CountryOption[] }>(
          res,
          'Unable to load countries right now.',
          'COUNTRIES_LOAD_FAILED',
        );
        if (!controller.signal.aborted) {
          setCountries(data.items ?? []);
          setError(null);
          setErrorEnvelope(null);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          const isAbort = caughtError instanceof Error && caughtError.name === 'AbortError';
          if (!isAbort) {
            const apiError = toHookApiError(
              caughtError,
              'Unable to load countries right now.',
              'COUNTRIES_LOAD_FAILED',
            );
            captureFrontendError(apiError, {
              flow: 'recruiter_registration',
              endpoint: '/api/reference/countries',
              action: 'load_countries',
              role: 'anonymous',
            });
            captureFrontendMessage('Countries API returned non-2xx', {
              flow: 'recruiter_registration',
              endpoint: '/api/reference/countries',
              action: 'load_countries',
              role: 'anonymous',
              extra: {
                code: apiError.envelope.code,
                requestId: apiError.envelope.requestId,
                status: apiError.envelope.status,
              },
            });
            setError(apiError.envelope.message);
            setErrorEnvelope(apiError.envelope);
          }
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchCountries();
    return () => { controller.abort(); };
  }, []);

  return { countries, isLoading, error, errorEnvelope };
}
