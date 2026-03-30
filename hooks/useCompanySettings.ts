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
import { toCompanyProfile } from '@/lib/core/adapters';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { toHookApiError } from '@/lib/core/error-envelope';
import { getSessionMe, updateSessionMeProfile } from '@/lib/auth/client';

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

const COMPANY_SETTINGS_UNAVAILABLE_MESSAGE =
  'Company settings are partially connected. Notifications and payment methods are pending backend integration.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractFirstCompanyId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = payload.data;
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const first = data[0];
  if (!isRecord(first)) {
    return null;
  }

  return typeof first.id === 'string' && first.id.length > 0
    ? first.id
    : null;
}

export function useCompanySettings() {
  const [state, setState] = useState<CompanySettingsState>({
    profile: INITIAL_PROFILE,
    notifications: INITIAL_NOTIFICATIONS,
    paymentMethods: [],
    isLoading: false,
    error: null,
  });

  const companyIdRef = useRef<string | null>(null);
  const profileSnapshotRef = useRef<CompanyProfile>(INITIAL_PROFILE);

  const setFeatureUnavailableError = useCallback((action: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: COMPANY_SETTINGS_UNAVAILABLE_MESSAGE,
    }));

    captureFrontendMessage('Company settings integration gap', {
      flow: 'company_settings',
      endpoint: 'pending-integrations',
      action,
      role: 'recruiter',
      extra: {
        reason: 'unimplemented_microservice_dependency',
      },
    });
  }, []);

  const resolveCompanyId = useCallback(async (companyIdHint: string): Promise<string | null> => {
    if (companyIdHint) {
      return companyIdHint;
    }

    const companiesPayload = await coreGetJson<unknown>(
      '/api/core/companies',
      'Failed to resolve company context',
      'COMPANY_SETTINGS_COMPANY_RESOLUTION_FAILED',
      { limit: 1, offset: 0 },
    );

    return extractFirstCompanyId(companiesPayload);
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
      const companyId = companyIdRef.current;
      if (!companyId) {
        setFeatureUnavailableError('save_profile_missing_company_id');
        return;
      }

      const snapshot = profileSnapshotRef.current;

      if (state.profile.companyName !== snapshot.companyName) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Company name is managed by admins and cannot be changed by recruiters.',
        }));
        return;
      }

      await updateSessionMeProfile({
        fullName: state.profile.contactName,
        phoneNumber: state.profile.phone || null,
      });

      const payload = await corePatchJson<unknown, {
        address_line1: string;
        address_line2: string;
        city: string;
        postcode: string;
      }>(
        `/api/core/companies/${companyId}`,
        {
          address_line1: state.profile.addressLine1,
          address_line2: state.profile.addressLine2 || '',
          city: state.profile.city,
          postcode: state.profile.postcode,
        },
        'Failed to save company profile',
        'COMPANY_SETTINGS_SAVE_PROFILE_FAILED',
      );

      const mappedProfile = toCompanyProfile(payload);
      if (!mappedProfile) {
        throw new Error('Core profile payload is invalid');
      }

      const nextProfile: CompanyProfile = {
        ...mappedProfile,
        contactName: state.profile.contactName,
        email: snapshot.email,
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
        'Failed to save company profile',
        'COMPANY_SETTINGS_SAVE_PROFILE_FAILED',
      );

      captureFrontendError(apiError, {
        flow: 'company_settings',
        endpoint: '/api/core/companies/:id',
        action: 'save_profile',
        role: 'recruiter',
      });

      captureFrontendMessage('Company profile save failed', {
        flow: 'company_settings',
        endpoint: '/api/core/companies/:id',
        action: 'save_profile',
        role: 'recruiter',
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
    // TODO: connect to Communications service notification preferences API.
    setFeatureUnavailableError('save_notifications_not_implemented');
  }, [setFeatureUnavailableError]);

  const addPaymentMethod = useCallback(async (paymentData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => {
    void paymentData;
    // TODO: connect to Payments service card vaulting + default method endpoints.
    setFeatureUnavailableError('add_payment_method_not_implemented');
  }, [setFeatureUnavailableError]);

  const deletePaymentMethod = useCallback(async (paymentMethodId: string) => {
    void paymentMethodId;
    // TODO: connect to Payments service card management endpoints.
    setFeatureUnavailableError('delete_payment_method_not_implemented');
  }, [setFeatureUnavailableError]);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: string) => {
    void paymentMethodId;
    // TODO: connect to Payments service default payment method endpoint.
    setFeatureUnavailableError('set_default_payment_method_not_implemented');
  }, [setFeatureUnavailableError]);

  const loadSettings = useCallback(async (companyIdHint: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const companyId = await resolveCompanyId(companyIdHint);
      if (!companyId) {
        setFeatureUnavailableError('load_settings_company_id_missing');
        return;
      }

      const profilePayload = await coreGetJson<unknown>(
        `/api/core/companies/${companyId}`,
        'Failed to load company profile',
        'COMPANY_SETTINGS_LOAD_PROFILE_FAILED',
      );
      const profile = toCompanyProfile(profilePayload);

      const session = await getSessionMe();

      if (!profile) {
        throw new Error('Core company profile payload is invalid');
      }

      const enrichedProfile: CompanyProfile = {
        ...profile,
        contactName: session.user.fullName ?? '',
        email: session.user.email,
        phone: session.user.phoneNumber ?? '',
      };

      companyIdRef.current = companyId;
      profileSnapshotRef.current = enrichedProfile;

      // TODO: replace these placeholders with Communications + Payments service data once integrated.
      setState((prev) => ({
        ...prev,
        profile: enrichedProfile,
        notifications: {
          ...INITIAL_NOTIFICATIONS,
          companyId,
        },
        paymentMethods: [],
        isLoading: false,
        error: null,
      }));
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        'Failed to load company settings',
        'COMPANY_SETTINGS_LOAD_FAILED',
      );

      captureFrontendError(apiError, {
        flow: 'company_settings',
        endpoint: '/api/core/companies/:id',
        action: 'load_settings',
        role: 'recruiter',
      });

      captureFrontendMessage('Company settings load failed', {
        flow: 'company_settings',
        endpoint: '/api/core/companies/:id',
        action: 'load_settings',
        role: 'recruiter',
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
  }, [resolveCompanyId, setFeatureUnavailableError]);

  return {
    profile: state.profile,
    notifications: state.notifications,
    paymentMethods: state.paymentMethods,
    isLoading: state.isLoading,
    error: state.error,

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
