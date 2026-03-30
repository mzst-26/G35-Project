'use client';

import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradeProfileTab } from '@/components/settings/TradeProfileTab';
import { PaymentMethodsTab } from '@/components/settings/PaymentMethodsTab';
import { TradeNotificationsTab } from '@/components/settings/TradeNotificationsTab';
import { useTradeSettings } from '@/hooks/useTradeSettings';

interface TradeSettingsSectionProps {
  tradeId: string;
}

/**
 * TradeSettingsSection Component
 * Renders the complete settings interface for trade workers with all tabs
 * Integrates with useCompanySettings hook for state management
 * Used as a section within the trade dashboard
 *
 */
export function TradeSettingsSection({ tradeId }: TradeSettingsSectionProps) {
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
    deletePaymentMethod,
    setDefaultPaymentMethod,
    loadSettings,
  } = useTradeSettings();

  // Load settings on component mount
  useEffect(() => {
    loadSettings(tradeId);
  }, [tradeId, loadSettings]);

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
        <p className="text-slate-600">Manage your profile, payment methods, and preferences</p>
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
          <TradeProfileTab
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
          <TradeNotificationsTab
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
