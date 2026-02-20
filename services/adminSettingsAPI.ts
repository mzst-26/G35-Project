import type { AdminSettings } from "@/types/admin-settings";

/**
 * Placeholder API layer for admin settings.
 * Replace mock data and implementations with real HTTP calls
 * once the backend is available.
 */

let MOCK_ADMIN_SETTINGS: AdminSettings = {
  general: {
    platformName: "TradesFair",
    platformEmail: "admin@tradesfair.com",
    supportEmail: "support@tradesfair.com",
    timezone: "Europe/London",
  },
  notifications: {
    emailNotifications: true,
    newUserAlerts: true,
    appealAlerts: true,
    supportTicketAlerts: true,
    systemAlerts: true,
  },
  payments: {
    platformFeePercent: 5.5,
    lateCancellationFee: 50,
    noShowFee: 100,
    lateArrivalFee: 30,
  },
  jobs: {
    maxJobsPerTrade: 10,
    jobCancellationWindowHours: 24,
  },
  users: {
    autoSuspensionThreshold: 3,
  },
};

/**
 * Fetch admin settings
 * (GET /admin/settings)
 */
export async function getAdminSettings(): Promise<AdminSettings> {
  // TODO: Replace with real HTTP GET request
  return Promise.resolve(structuredClone(MOCK_ADMIN_SETTINGS));
}

/**
 * Update admin settings
 * (PUT /admin/settings)
 */
export async function updateAdminSettings(
  settings: AdminSettings
): Promise<void> {
  // TODO: Replace with real HTTP PUT request
  MOCK_ADMIN_SETTINGS = structuredClone(settings);
  return Promise.resolve();
}

/**
 * Reset admin settings to system defaults
 * (POST /admin/settings/reset)
 */
export async function resetAdminSettings(): Promise<AdminSettings> {
  // TODO: Replace with backend-driven defaults
  MOCK_ADMIN_SETTINGS = {
    general: {
      platformName: "TradesFair",
      platformEmail: "admin@tradesfair.com",
      supportEmail: "support@tradesfair.com",
      timezone: "Europe/London",
    },
    notifications: {
      emailNotifications: false,
      newUserAlerts: false,
      appealAlerts: false,
      supportTicketAlerts: false,
      systemAlerts: false,
    },
    payments: {
      platformFeePercent: null,
      lateCancellationFee: null,
      noShowFee: null,
      lateArrivalFee: null,
    },
    jobs: {
      maxJobsPerTrade: null,
      jobCancellationWindowHours: null,
    },
    users: {
      autoSuspensionThreshold: null,
    },
  };

  return Promise.resolve(structuredClone(MOCK_ADMIN_SETTINGS));
}

/**
 * Validate settings before saving
 * (client-side guard; backend should still validate)
 */
export function validateAdminSettings(settings: AdminSettings): string[] {
  const errors: string[] = [];

  if (settings.payments.platformFeePercent !== null) {
    if (
      settings.payments.platformFeePercent < 0 ||
      settings.payments.platformFeePercent > 100
    ) {
      errors.push("Platform fee must be between 0 and 100%");
    }
  }

  if (settings.jobs.maxJobsPerTrade !== null) {
    if (settings.jobs.maxJobsPerTrade < 1) {
      errors.push("Max jobs per trade must be at least 1");
    }
  }

  if (settings.users.autoSuspensionThreshold !== null) {
    if (settings.users.autoSuspensionThreshold < 1) {
      errors.push("Auto-suspension threshold must be at least 1");
    }
  }

  return errors;
}