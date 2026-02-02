"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminSettings } from "@/types/admin-settings";
import { emptyAdminSettings } from "@/types/admin-settings";
import {
  getAdminSettings,
  updateAdminSettings,
  validateAdminSettings,
} from "@/services/adminSettingsAPI";

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(emptyAdminSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminSettings();
      setSettings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const validationErrors = validateAdminSettings(settings);
      if (validationErrors.length > 0) {
        setError(validationErrors[0]); // keep it simple: show first error
        return;
      }

      await updateAdminSettings(settings);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const actions = useMemo(() => {
    return {
      setNotifications<K extends keyof AdminSettings["notifications"]>(
        key: K,
        value: boolean,
      ) {
        setSettings((prev) => ({
          ...prev,
          notifications: { ...prev.notifications, [key]: value },
        }));
      },

      setPaymentsNumber<K extends keyof AdminSettings["payments"]>(
        key: K,
        value: string,
      ) {
        const parsed = parseNumberOrNull(value);
        setSettings((prev) => ({
          ...prev,
          payments: { ...prev.payments, [key]: parsed },
        }));
      },

      setJobsNumber<K extends keyof AdminSettings["jobs"]>(key: K, value: string) {
        const parsed = parseNumberOrNull(value);
        setSettings((prev) => ({
          ...prev,
          jobs: { ...prev.jobs, [key]: parsed },
        }));
      },

      setUsersNumber<K extends keyof AdminSettings["users"]>(key: K, value: string) {
        const parsed = parseNumberOrNull(value);
        setSettings((prev) => ({
          ...prev,
          users: { ...prev.users, [key]: parsed },
        }));
      },
    };
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    saveSuccess,
    refetch: fetchSettings,
    save,
    actions,
  };
}