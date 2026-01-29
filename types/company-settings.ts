/**
 * types/company-settings.ts
 * Type definitions for company settings feature
 * Includes profile, notifications, and payment method interfaces
 */

/**
 * Company profile information
 * Contains basic company details and contact information
 */
export interface CompanyProfile {
  id: string; // UUID for database record
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string; // Optional second address line
  city: string;
  postcode: string;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Email notification preferences
 * Controls which email notifications are sent
 */
export interface EmailNotifications {
  jobAllocated: boolean;
  jobCompleted: boolean;
  paymentReminder: boolean;
}

/**
 * SMS notification preferences
 * Controls which SMS notifications are sent
 */
export interface SmsNotifications {
  jobAllocated: boolean;
  jobCompleted: boolean;
  paymentReminder: boolean;
}

/**
 * Complete notification preferences object
 * Combines email and SMS settings
 */
export interface NotificationPreferences {
  id: string; // UUID for database record
  companyId: string; // Foreign key to company
  email: EmailNotifications;
  sms: SmsNotifications;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payment method information
 * Represents a saved credit/debit card
 */
export interface PaymentMethod {
  id: string; // UUID for database record
  type: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  last4: string; // Last 4 digits of card
  expiry: string; // MM/YY format
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Complete company settings state
 * Combines all settings sections
 */
export interface CompanySettingsState {
  profile: CompanyProfile;
  notifications: NotificationPreferences;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Form submission payload for profile updates
 * Used when sending updates to backend
 */
export interface ProfileUpdatePayload {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
}

/**
 * Form submission payload for notification updates
 */
export interface NotificationUpdatePayload {
  email: EmailNotifications;
  sms: SmsNotifications;
}
