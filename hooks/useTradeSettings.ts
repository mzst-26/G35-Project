'use client';

import { useState, useCallback, useRef } from 'react';
import {
  CompanyProfile,
  NotificationPreferences,
  PaymentMethod,
  CompanySettingsState,
  EmailNotifications,
  SmsNotifications,
} from '@/types/company-settings';
import { coreGetJson, corePatchJson } from '@/lib/core/client';
import { toTradeProfile } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { toHookApiError } from '@/lib/core/error-envelope';

const INITIAL_PROFILE: CompanyProfile = {
  id: '',
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  createdAt: '',
  updatedAt: '',
};

const INITIAL_NOTIFICATIONS: NotificationPreferences = {
  id: '',
  companyId: '',
  email: {
    jobAllocated: true,
    jobCompleted: true,
    paymentReminder: true,
  },
  sms: {
    jobAllocated: false,
    jobCompleted: false,
    paymentReminder: false,
  },
  createdAt: '',
  updatedAt: '',
};

const TRADE_SETTINGS_UNAVAILABLE_MESSAGE =
  'Trade settings are not fully connected yet. TODO: expose worker contact fields from Identity service and add trade notifications/payment method endpoints.';

export function useTradeSettings() {
  const [state, setState] = useState<CompanySettingsState>({
    profile: INITIAL_PROFILE,
    notifications: INITIAL_NOTIFICATIONS,
    paymentMethods: [],
    isLoading: false,
    error: null,
  });

  const workerIdRef = useRef<string | null>(null);
  const profileSnapshotRef = useRef<CompanyProfile>(INITIAL_PROFILE);

  const setFeatureUnavailableError = useCallback((action: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: TRADE_SETTINGS_UNAVAILABLE_MESSAGE,
    }));

    captureFrontendMessage('Trade settings integration gap', {
      flow: 'trade_settings',
      endpoint: 'pending-integrations',
      action,
      role: 'trade',
      extra: {
        reason: 'unimplemented_microservice_dependency',
      },
    });
  }, []);

  const updateProfileField = useCallback(
    (field: keyof CompanyProfile, value: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [field]: value,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    []
  );

  const toggleEmailNotification = useCallback(
    (notification: keyof EmailNotifications) => {
      setState((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          email: {
            ...prev.notifications.email,
            [notification]: !prev.notifications.email[notification],
          },
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    []
  );

  const toggleSmsNotification = useCallback(
    (notification: keyof SmsNotifications) => {
      setState((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          sms: {
            ...prev.notifications.sms,
            [notification]: !prev.notifications.sms[notification],
          },
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    []
  );

  const saveProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const workerId = workerIdRef.current;
      if (!workerId) {
        setFeatureUnavailableError('save_profile_missing_worker_id');
        return;
      }

      const snapshot = profileSnapshotRef.current;
      const unsupportedFieldChanged =
        state.profile.contactName !== snapshot.contactName ||
        state.profile.email !== snapshot.email ||
        state.profile.phone !== snapshot.phone;

      // TODO: update contact name/email/phone via Identity service once worker contact fields are exposed.
      if (unsupportedFieldChanged) {
        setFeatureUnavailableError('save_profile_unsupported_fields');
        return;
      }

      const payload = await corePatchJson<unknown, {
        bio: string;
        qualifications: string | null;
        address_line1: string;
        address_line2: string;
        city: string;
      }>(
        `/api/core/workers/${workerId}`,
        {
          bio: state.profile.companyName,
          qualifications: null,
          address_line1: state.profile.addressLine1,
          address_line2: state.profile.addressLine2 || '',
          city: state.profile.city,
        },
        'Failed to save worker profile',
        'TRADE_SETTINGS_SAVE_PROFILE_FAILED',
      );

      const mappedProfile = toTradeProfile(payload);
      if (!mappedProfile) {
        throw new Error('Core worker payload is invalid');
      }

      const nextProfile: CompanyProfile = {
        ...mappedProfile,
        contactName: state.profile.contactName,
        email: state.profile.email,
        phone: state.profile.phone,
      };

      profileSnapshotRef.current = nextProfile;
      setState((prev) => ({
        ...prev,
        profile: nextProfile,
        isLoading: false,
        error: null,
      }));
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        'Failed to save worker profile',
        'TRADE_SETTINGS_SAVE_PROFILE_FAILED',
      );

      captureFrontendError(apiError, {
        flow: 'trade_settings',
        endpoint: '/api/core/workers/:id',
        action: 'save_profile',
        role: 'trade',
      });

      captureFrontendMessage('Trade profile save failed', {
        flow: 'trade_settings',
        endpoint: '/api/core/workers/:id',
        action: 'save_profile',
        role: 'trade',
        extra: {
          code: apiError.envelope.code,
          requestId: apiError.envelope.requestId,
          status: apiError.envelope.status,
        },
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: apiError.envelope.message,
      }));
    }
  }, [setFeatureUnavailableError, state.profile]);

  const saveNotifications = useCallback(async () => {
    // TODO: connect to Communications service notification preferences API for workers.
    setFeatureUnavailableError('save_notifications_not_implemented');
  }, [setFeatureUnavailableError]);

  const addPaymentMethod = useCallback(async (paymentData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => {
    void paymentData;
    // TODO: connect to Payments service card vaulting + default method endpoints for workers.
    setFeatureUnavailableError('add_payment_method_not_implemented');
  }, [setFeatureUnavailableError]);

  const deletePaymentMethod = useCallback(async (paymentMethodId: string) => {
    void paymentMethodId;
    // TODO: connect to Payments service card management endpoints for workers.
    setFeatureUnavailableError('delete_payment_method_not_implemented');
  }, [setFeatureUnavailableError]);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: string) => {
    void paymentMethodId;
    // TODO: connect to Payments service default payment method endpoint for workers.
    setFeatureUnavailableError('set_default_payment_method_not_implemented');
  }, [setFeatureUnavailableError]);

  const loadSettings = useCallback(async (workerIdHint: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!workerIdHint) {
        setFeatureUnavailableError('load_settings_worker_id_missing');
        return;
      }

      const profilePayload = await coreGetJson<unknown>(
        `/api/core/workers/${workerIdHint}`,
        'Failed to load worker profile',
        'TRADE_SETTINGS_LOAD_PROFILE_FAILED',
      );
      const profile = toTradeProfile(profilePayload);

      if (!profile) {
        throw new Error('Core worker profile payload is invalid');
      }

      workerIdRef.current = workerIdHint;
      profileSnapshotRef.current = profile;

      // TODO: replace these placeholders with Communications + Payments service data once integrated for workers.
      setState((prev) => ({
        ...prev,
        profile,
        notifications: {
          ...INITIAL_NOTIFICATIONS,
          companyId: workerIdHint,
        },
        paymentMethods: [],
        isLoading: false,
        error: null,
      }));
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        'Failed to load trade settings',
        'TRADE_SETTINGS_LOAD_FAILED',
      );

      captureFrontendError(apiError, {
        flow: 'trade_settings',
        endpoint: '/api/core/workers/:id',
        action: 'load_settings',
        role: 'trade',
      });

      captureFrontendMessage('Trade settings load failed', {
        flow: 'trade_settings',
        endpoint: '/api/core/workers/:id',
        action: 'load_settings',
        role: 'trade',
        extra: {
          code: apiError.envelope.code,
          requestId: apiError.envelope.requestId,
          status: apiError.envelope.status,
        },
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: apiError.envelope.message,
      }));
    }
  }, [setFeatureUnavailableError]);

  return {
    ...state,
    updateProfileField,
    saveProfile,
    toggleEmailNotification,
    toggleSmsNotification,
    saveNotifications,
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    loadSettings,
  };
}
