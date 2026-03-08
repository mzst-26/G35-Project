export type UserType = "trade" | "company";
export type UserStatus = "active" | "suspended" | "pending";

export type ActivityType = "success" | "error" | "warning" | "info";

export type UserActivityItem = {
  date: string; // ISO string or YYYY-MM-DD
  action: string;
  type: ActivityType;
};

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: UserType;
  location: string;
  joinDate: string;
  rating: number | null;
  status: UserStatus;
  verified: boolean;
  specialty?: string; // trade only
  industry?: string; // company only
  completedJobs?: number; // trade typically
  postedJobs?: number; // company typically
};

export type AdminUserDetail = AdminUserSummary & {
  address: string;
  cancelledJobs: number | null;
  totalReviews: number | null;

  // finance-ish
  totalEarnings?: number | null; // trade
  totalSpent?: number | null; // company
  pendingPayments: number | null;

  // penalties
  activePenalties: number | null;
  totalPenalties: number | null;

  bio: string;

  // trade extras
  skills?: string[];
  certifications?: string[];

  // company extras
  companySize?: string;
  registrationNumber?: string;
  vatNumber?: string;

  // suspension
  suspensionReason?: string;
  suspensionDate?: string;

  recentActivity: UserActivityItem[];
};

export const emptyUserDetail: AdminUserDetail = {
  id: "",
  name: "",
  email: "",
  phone: "",
  type: "trade",
  location: "",
  joinDate: "",
  rating: null,
  status: "pending",
  verified: false,

  address: "",
  cancelledJobs: null,
  totalReviews: null,

  pendingPayments: null,
  activePenalties: null,
  totalPenalties: null,

  bio: "",
  recentActivity: [],
};