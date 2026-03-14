'use client';

import { useState, useEffect } from 'react';

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
        if (!res.ok) throw new Error('Unable to load countries right now.');
        const data = (await res.json()) as { items?: CountryOption[] };
        if (!controller.signal.aborted) {
          setCountries(data.items ?? []);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
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
