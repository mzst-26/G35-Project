'use client';

import { useState, useCallback } from 'react';
import {
  CompanyProfile,
  NotificationPreferences,
  PaymentMethod,
  CompanySettingsState,
  EmailNotifications,
  SmsNotifications,
} from '@/types/company-settings';

/**
 * useCompanySettings Hook
 * Manages all company settings state and provides handler functions
 * State includes: profile, notifications, paymentMethods, isLoading, error
 * Ready to integrate with backend API calls
 */

// Initial state for a new company settings
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
    paymentReminder: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useCompanySettings() {
  // Main state for all company settings
  const [state, setState] = useState<CompanySettingsState>({
    profile: INITIAL_PROFILE,
    notifications: INITIAL_NOTIFICATIONS,
    paymentMethods: [],
    isLoading: false,
    error: null,
  });

  /**
   * Update a single profile field
   * Performs immutable update to avoid mutations
   */
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

  /**
   * Toggle an email notification setting
   */
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

  /**
   * Toggle an SMS notification setting
   */
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

  /**
   * Save profile changes to backend
   * TODO: Replace with actual API call to backend
   */
  const saveProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Call API endpoint
      // const response = await fetch('/api/company/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(state.profile),
      // });
      // const updatedProfile = await response.json();
      // setState((prev) => ({ ...prev, profile: updatedProfile, isLoading: false }));

      // Placeholder: Simulate successful save
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, []);

  /**
   * Save notification preferences to backend
   * TODO: Replace with actual API call to backend
   */
  const saveNotifications = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Call API endpoint
      // const response = await fetch('/api/company/notifications', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(state.notifications),
      // });
      // const updatedNotifications = await response.json();
      // setState((prev) => ({ ...prev, notifications: updatedNotifications, isLoading: false }));

      // Placeholder: Simulate successful save
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save notifications';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, []);

  /**
   * Add a new payment method
   * In real implementation, this would open a payment modal/form
   * TODO: Replace with actual API call to Stripe/backend
   */
  const addPaymentMethod = useCallback(async (paymentData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Call Stripe API or backend endpoint
      // const response = await fetch('/api/company/payment-methods', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(paymentData),
      // });
      // const newPaymentMethod = await response.json();

      // Placeholder: Create new payment method with generated ID
      const newPaymentMethod: PaymentMethod = {
        id: `pm_${Date.now()}`, // Placeholder ID generation
        ...paymentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        paymentMethods: [...prev.paymentMethods, newPaymentMethod],
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add payment method';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, []);

  /**
   * Delete a payment method by ID
   * TODO: Replace with actual API call to backend
   */
  const deletePaymentMethod = useCallback(async (paymentMethodId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Call API endpoint
      // await fetch(`/api/company/payment-methods/${paymentMethodId}`, {
      //   method: 'DELETE',
      // });

      // Remove payment method from state
      setState((prev) => ({
        ...prev,
        paymentMethods: prev.paymentMethods.filter((pm) => pm.id !== paymentMethodId),
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete payment method';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, []);

  /**
   * Set a payment method as the default one
   * TODO: Replace with actual API call to backend
   */
  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Call API endpoint
      // await fetch(`/api/company/payment-methods/${paymentMethodId}/set-default`, {
      //   method: 'PATCH',
      // });

      // Update payment methods to set new default
      setState((prev) => ({
        ...prev,
        paymentMethods: prev.paymentMethods.map((pm) => ({
          ...pm,
          isDefault: pm.id === paymentMethodId,
          updatedAt: new Date().toISOString(),
        })),
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set default payment method';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, []);

  /**
   * Load all company settings from backend
   * Called on component mount
   * TODO: Replace with actual API calls to backend
   */
  const loadSettings = useCallback(async (_companyId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Call API endpoints to fetch all data
      // const [profile, notifications, payments] = await Promise.all([
      //   fetch(`/api/company/${companyId}/profile`).then(r => r.json()),
      //   fetch(`/api/company/${companyId}/notifications`).then(r => r.json()),
      //   fetch(`/api/company/${companyId}/payment-methods`).then(r => r.json()),
      // ]);

      // Placeholder: Set default mock data
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, []);

  // Return all state and handler functions
  return {
    // State values
    profile: state.profile,
    notifications: state.notifications,
    paymentMethods: state.paymentMethods,
    isLoading: state.isLoading,
    error: state.error,

    // Profile handlers
    updateProfileField,
    saveProfile,

    // Notification handlers
    toggleEmailNotification,
    toggleSmsNotification,
    saveNotifications,

    // Payment method handlers
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,

    // Data loading
    loadSettings,
  };
}
