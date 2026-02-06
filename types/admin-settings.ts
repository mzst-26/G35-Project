export interface AdminSettings {
  siteTitle: string;
  allowRegistrations: boolean;
  maintenanceMode: boolean;
  defaultUserRole?: string;
}

export interface NotificationSetting {
  id: string;
  type: string;
  enabled: boolean;
}

export interface PaymentMethod {
  id: string;
  provider: string;
  last4?: string;
  active: boolean;
}

export type AdminSettingsTab = "general" | "notifications" | "payments";
