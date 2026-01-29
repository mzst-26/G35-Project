'use server';

import {
  CompanyProfile,
  NotificationPreferences,
  PaymentMethod,
  ProfileUpdatePayload,
  NotificationUpdatePayload,
} from '@/types/company-settings';

/**
 * companySettingsApi.ts - Service Layer
 * Abstracts all API calls to backend for company settings
 * Marked with 'use server' for Next.js App Router
 * All endpoints include TODO markers showing where real backend integration goes
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_API_BASE_URL: Base URL for API (e.g., https://api.example.com)
 * - NEXT_PUBLIC_API_KEY: API authentication key
 */

// Environment variables for API calls
// TODO: These will be used when implementing real backend calls
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
// const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

/**
 * Helper function to build fetch options with authentication
 * Adds API key and content-type headers to all requests
 */
const buildFetchOptions = (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') => ({
  method,
  headers: {
    'Content-Type': 'application/json',
    // 'Authorization': `Bearer ${API_KEY}`, // TODO: Add when API key auth is ready
  },
});

/**
 * Fetch company profile from backend
 * GET /api/company/{companyId}/profile
 *
 * @param companyId - Unique identifier for the company
 * @returns Promise<CompanyProfile> - Company profile data
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function getCompanyProfile(companyId: string): Promise<CompanyProfile> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/profile`,
    //   buildFetchOptions('GET')
    // );
    // if (!response.ok) throw new Error('Failed to fetch profile');
    // return await response.json();

    // Placeholder: Return mock data for development
    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    console.error('getCompanyProfile error:', message);
    throw new Error(message);
  }
}

/**
 * Update company profile on backend
 * PUT /api/company/{companyId}/profile
 *
 * @param companyId - Unique identifier for the company
 * @param profileData - Updated profile information
 * @returns Promise<CompanyProfile> - Updated profile from backend
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function updateCompanyProfile(
  companyId: string,
  profileData: ProfileUpdatePayload
): Promise<CompanyProfile> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/profile`,
    //   {
    //     ...buildFetchOptions('PUT'),
    //     body: JSON.stringify(profileData),
    //   }
    // );
    // if (!response.ok) throw new Error('Failed to update profile');
    // return await response.json();

    // Placeholder: Log the data that would be sent
    console.log('updateCompanyProfile called with:', { companyId, profileData });
    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    console.error('updateCompanyProfile error:', message);
    throw new Error(message);
  }
}

/**
 * Fetch notification preferences from backend
 * GET /api/company/{companyId}/notifications
 *
 * @param companyId - Unique identifier for the company
 * @returns Promise<NotificationPreferences> - Notification settings
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function getNotificationPreferences(
  companyId: string
): Promise<NotificationPreferences> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/notifications`,
    //   buildFetchOptions('GET')
    // );
    // if (!response.ok) throw new Error('Failed to fetch notifications');
    // return await response.json();

    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    console.error('getNotificationPreferences error:', message);
    throw new Error(message);
  }
}

/**
 * Update notification preferences on backend
 * PUT /api/company/{companyId}/notifications
 *
 * @param companyId - Unique identifier for the company
 * @param notificationData - Updated notification settings
 * @returns Promise<NotificationPreferences> - Updated preferences from backend
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function updateNotificationPreferences(
  companyId: string,
  notificationData: NotificationUpdatePayload
): Promise<NotificationPreferences> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/notifications`,
    //   {
    //     ...buildFetchOptions('PUT'),
    //     body: JSON.stringify(notificationData),
    //   }
    // );
    // if (!response.ok) throw new Error('Failed to update notifications');
    // return await response.json();

    console.log('updateNotificationPreferences called with:', {
      companyId,
      notificationData,
    });
    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update notifications';
    console.error('updateNotificationPreferences error:', message);
    throw new Error(message);
  }
}

/**
 * Fetch saved payment methods from backend
 * GET /api/company/{companyId}/payment-methods
 *
 * @param companyId - Unique identifier for the company
 * @returns Promise<PaymentMethod[]> - Array of saved payment methods
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function getPaymentMethods(companyId: string): Promise<PaymentMethod[]> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/payment-methods`,
    //   buildFetchOptions('GET')
    // );
    // if (!response.ok) throw new Error('Failed to fetch payment methods');
    // return await response.json();

    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payment methods';
    console.error('getPaymentMethods error:', message);
    throw new Error(message);
  }
}

/**
 * Add a new payment method
 * This typically integrates with Stripe or similar payment processor
 * POST /api/company/{companyId}/payment-methods
 *
 * @param companyId - Unique identifier for the company
 * @param paymentToken - Tokenized payment data from Stripe/payment processor
 * @returns Promise<PaymentMethod> - New payment method created on backend
 *
 * TODO: Replace with actual Stripe API integration + backend call
 */
export async function addPaymentMethod(
  companyId: string,
  paymentToken: string
): Promise<PaymentMethod> {
  try {
    // TODO: Implement Stripe integration
    // 1. Create payment method in Stripe using paymentToken
    // 2. Save payment method reference in backend database
    // Example:
    // const stripeResponse = await stripe.paymentMethods.create({ ... });
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/payment-methods`,
    //   {
    //     ...buildFetchOptions('POST'),
    //     body: JSON.stringify({ stripePaymentMethodId: stripeResponse.id }),
    //   }
    // );
    // return await response.json();

    console.log('addPaymentMethod called with:', { companyId, paymentToken });
    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add payment method';
    console.error('addPaymentMethod error:', message);
    throw new Error(message);
  }
}

/**
 * Delete a payment method
 * DELETE /api/company/{companyId}/payment-methods/{paymentMethodId}
 *
 * @param companyId - Unique identifier for the company
 * @param paymentMethodId - ID of payment method to delete
 * @returns Promise<void>
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function deletePaymentMethod(
  companyId: string,
  paymentMethodId: string
): Promise<void> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/payment-methods/${paymentMethodId}`,
    //   buildFetchOptions('DELETE')
    // );
    // if (!response.ok) throw new Error('Failed to delete payment method');

    console.log('deletePaymentMethod called with:', { companyId, paymentMethodId });
    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete payment method';
    console.error('deletePaymentMethod error:', message);
    throw new Error(message);
  }
}

/**
 * Set a payment method as the default one
 * PATCH /api/company/{companyId}/payment-methods/{paymentMethodId}/set-default
 *
 * @param companyId - Unique identifier for the company
 * @param paymentMethodId - ID of payment method to set as default
 * @returns Promise<PaymentMethod> - Updated payment method
 *
 * TODO: Replace with actual fetch call to backend
 */
export async function setDefaultPaymentMethod(
  companyId: string,
  paymentMethodId: string
): Promise<PaymentMethod> {
  try {
    // TODO: Uncomment and use real API endpoint
    // const response = await fetch(
    //   `${API_BASE_URL}/company/${companyId}/payment-methods/${paymentMethodId}/set-default`,
    //   buildFetchOptions('PATCH')
    // );
    // if (!response.ok) throw new Error('Failed to set default payment method');
    // return await response.json();

    console.log('setDefaultPaymentMethod called with:', { companyId, paymentMethodId });
    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to set default payment method';
    console.error('setDefaultPaymentMethod error:', message);
    throw new Error(message);
  }
}

/**
 * Load all company settings at once
 * Convenience function that fetches profile, notifications, and payment methods in parallel
 *
 * @param companyId - Unique identifier for the company
 * @returns Promise with all settings data
 *
 * TODO: Replace with actual fetch calls to backend
 */
export async function loadAllSettings(companyId: string) {
  try {
    // TODO: Uncomment and use real API endpoints
    // const [profile, notifications, paymentMethods] = await Promise.all([
    //   getCompanyProfile(companyId),
    //   getNotificationPreferences(companyId),
    //   getPaymentMethods(companyId),
    // ]);
    //
    // return { profile, notifications, paymentMethods };

    throw new Error('Backend integration not yet implemented');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settings';
    console.error('loadAllSettings error:', message);
    throw new Error(message);
  }
}
