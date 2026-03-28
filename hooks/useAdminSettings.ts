"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminSettings } from "@/types/admin-settings";
import { emptyAdminSettings } from "@/types/admin-settings";
import { captureFrontendError, captureFrontendMessage } from "@/lib/monitoring/sentry";
import { HookErrorEnvelope, toHookApiError } from "@/lib/core/error-envelope";
import { coreGetJson, corePatchJson } from '@/lib/core/client';
import { toAdminSettings } from '@/lib/core/adapters';

const ADMIN_SETTINGS_CACHE_TTL_MS = 60_000;
let adminSettingsCache: { data: AdminSettings; updatedAt: number } | null = null;
let adminSettingsInflight: Promise<AdminSettings> | null = null;
const ENABLE_ADMIN_SETTINGS_CACHE = process.env.NODE_ENV !== "test";

function isSameGeneralProfile(
  left: AdminSettings["general"],
  right: AdminSettings["general"],
): boolean {
  return (
    left.fullName === right.fullName &&
    left.email === right.email &&
    left.phoneNumber === right.phoneNumber &&
    left.adminLevel === right.adminLevel
  );
}

function validateAdminSettings(settings: AdminSettings): string[] {
  const errors: string[] = [];

  if (settings.payments.platformFeePercent !== null) {
    if (settings.payments.platformFeePercent < 0 || settings.payments.platformFeePercent > 100) {
      errors.push('Platform fee must be between 0 and 100%');
    }
  }

  if (settings.jobs.maxJobsPerTrade !== null && settings.jobs.maxJobsPerTrade < 1) {
    errors.push('Max jobs per trade must be at least 1');
  }

  if (settings.users.autoSuspensionThreshold !== null && settings.users.autoSuspensionThreshold < 1) {
    errors.push('Auto-suspension threshold must be at least 1');
  }

  return errors;
}

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(
    ENABLE_ADMIN_SETTINGS_CACHE ? (adminSettingsCache?.data ?? emptyAdminSettings) : emptyAdminSettings,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnvelope, setErrorEnvelope] = useState<HookErrorEnvelope | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const immutableGeneralRef = useRef<AdminSettings["general"]>({
    fullName: "",
    email: "",
    phoneNumber: "",
    adminLevel: "",
  });

  const fetchSettings = useCallback(async () => {
    if (
      ENABLE_ADMIN_SETTINGS_CACHE &&
      adminSettingsCache &&
      Date.now() - adminSettingsCache.updatedAt < ADMIN_SETTINGS_CACHE_TTL_MS
    ) {
      setSettings(adminSettingsCache.data);
      immutableGeneralRef.current = adminSettingsCache.data.general;
      setError(null);
      setErrorEnvelope(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorEnvelope(null);
    try {
      if (!adminSettingsInflight || !ENABLE_ADMIN_SETTINGS_CACHE) {
        adminSettingsInflight = (async () => {
          const payload = await coreGetJson<unknown>(
            '/api/core/admin/settings',
            'Unable to load admin settings right now.',
            'ADMIN_SETTINGS_LOAD_FAILED',
          );
          return toAdminSettings(payload);
        })();
      }

      const data = await adminSettingsInflight;
      if (ENABLE_ADMIN_SETTINGS_CACHE) {
        adminSettingsCache = { data, updatedAt: Date.now() };
      }
      setSettings(data);
      immutableGeneralRef.current = data.general;
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        "Unable to load admin settings right now.",
        "ADMIN_SETTINGS_LOAD_FAILED",
      );
      captureFrontendError(apiError, {
        flow: "admin_settings",
        endpoint: "/api/core/admin/settings",
        action: "load",
        role: "admin",
      });
      captureFrontendMessage("Admin settings load failed", {
        flow: "admin_settings",
        endpoint: "/api/core/admin/settings",
        action: "load",
        role: "admin",
        extra: {
          code: apiError.envelope.code,
          requestId: apiError.envelope.requestId,
          status: apiError.envelope.status,
        },
      });
      setError(apiError.envelope.message);
      setErrorEnvelope(apiError.envelope);
    } finally {
      if (ENABLE_ADMIN_SETTINGS_CACHE) {
        adminSettingsInflight = null;
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setErrorEnvelope(null);
    setSaveSuccess(false);

    try {
      const validationErrors = validateAdminSettings(settings);
      if (validationErrors.length > 0) {
        const validationError = toHookApiError(
          new Error(validationErrors[0]),
          validationErrors[0],
          "ADMIN_SETTINGS_VALIDATION_FAILED",
          400,
        );
        setError(validationError.envelope.message);
        setErrorEnvelope(validationError.envelope);
        return;
      }

      if (!isSameGeneralProfile(settings.general, immutableGeneralRef.current)) {
        const immutableFieldError = toHookApiError(
          new Error("Admin profile fields are read-only and sourced from the database."),
          "Admin profile fields are read-only and sourced from the database.",
          "ADMIN_SETTINGS_IMMUTABLE_FIELDS",
          403,
        );
        setError(immutableFieldError.envelope.message);
        setErrorEnvelope(immutableFieldError.envelope);
        setSettings((prev) => ({
          ...prev,
          general: immutableGeneralRef.current,
        }));
        return;
      }

      await corePatchJson<unknown, AdminSettings>(
        '/api/core/admin/settings',
        settings,
        'Unable to save admin settings right now.',
        'ADMIN_SETTINGS_SAVE_FAILED',
      );

      if (ENABLE_ADMIN_SETTINGS_CACHE) {
        adminSettingsCache = { data: settings, updatedAt: Date.now() };
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        "Unable to save admin settings right now.",
        "ADMIN_SETTINGS_SAVE_FAILED",
      );
      captureFrontendError(apiError, {
        flow: "admin_settings",
        endpoint: "/api/core/admin/settings",
        action: "save",
        role: "admin",
      });
      captureFrontendMessage("Admin settings save failed", {
        flow: "admin_settings",
        endpoint: "/api/core/admin/settings",
        action: "save",
        role: "admin",
        extra: {
          code: apiError.envelope.code,
          requestId: apiError.envelope.requestId,
          status: apiError.envelope.status,
        },
      });
      setError(apiError.envelope.message);
      setErrorEnvelope(apiError.envelope);
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
    errorEnvelope,
    saveSuccess,
    refetch: fetchSettings,
    save,
    actions,
  };
}
