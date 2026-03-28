export interface AdminSettingsDto {
  general: {
    fullName: string;
    email: string;
    phoneNumber: string;
    adminLevel: string;
  };
  notifications: {
    emailNotifications: boolean;
    newUserAlerts: boolean;
    appealAlerts: boolean;
    supportTicketAlerts: boolean;
    systemAlerts: boolean;
  };
  payments: {
    platformFeePercent: number | null;
    lateCancellationFee: number | null;
    noShowFee: number | null;
    lateArrivalFee: number | null;
  };
  jobs: {
    maxJobsPerTrade: number | null;
    jobCancellationWindowHours: number | null;
  };
  users: {
    autoSuspensionThreshold: number | null;
  };
}

export function defaultAdminSettings(): AdminSettingsDto {
  return {
    general: {
      fullName: "",
      email: "",
      phoneNumber: "",
      adminLevel: "",
    },
    notifications: {
      emailNotifications: true,
      newUserAlerts: true,
      appealAlerts: true,
      supportTicketAlerts: true,
      systemAlerts: true,
    },
    payments: {
      platformFeePercent: 0,
      lateCancellationFee: 0,
      noShowFee: 0,
      lateArrivalFee: 0,
    },
    jobs: {
      maxJobsPerTrade: 10,
      jobCancellationWindowHours: 24,
    },
    users: {
      autoSuspensionThreshold: 3,
    },
  };
}
