'use client';

import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { PaymentMethodsTab } from '@/components/settings/PaymentMethodsTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface SettingsSectionProps {
  companyId: string;
}

/**
 * SettingsSection Component
 * Renders the complete settings interface with all tabs
 * Integrates with useCompanySettings hook for state management
 * Used as a section within the company dashboard
 *
 */
export function SettingsSection({ companyId }: SettingsSectionProps) {
  // Import all state and handlers from custom hook
  const {
    profile,
    notifications,
    paymentMethods,
    isLoading,
    error,
    updateProfileField,
    saveProfile,
    toggleEmailNotification,
    toggleSmsNotification,
    saveNotifications,
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    loadSettings,
  } = useCompanySettings();

  // Load settings on component mount
  useEffect(() => {
    loadSettings(companyId);
  }, [companyId, loadSettings]);

  // Display error if one occurred
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Error loading settings</p>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-600">Manage your account preferences and payment methods</p>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="profile" className="space-y-6">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ProfileTab
            profile={profile}
            isLoading={isLoading}
            onUpdateField={updateProfileField}
            onSave={saveProfile}
          />
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment">
          <PaymentMethodsTab
            paymentMethods={paymentMethods}
            isLoading={isLoading}
            onSetDefault={setDefaultPaymentMethod}
            onDelete={deletePaymentMethod}
            onAddNew={() => {
              // TODO: Open payment modal or navigate to payment form
              console.log('Open payment modal');
            }}
          />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationsTab
            notifications={notifications}
            isLoading={isLoading}
            onToggleEmailNotification={toggleEmailNotification}
            onToggleSmsNotification={toggleSmsNotification}
            onSave={saveNotifications}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
