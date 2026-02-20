export type AdminSettings = {
  general: {
    platformName: string;
    platformEmail: string;
    supportEmail: string;
    timezone: string;
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
};

export const emptyAdminSettings: AdminSettings = {
  general: {
    platformName: "",
    platformEmail: "",
    supportEmail: "",
    timezone: "",
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
