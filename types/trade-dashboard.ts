import type { LucideIcon } from "lucide-react";

export type TradeSectionKey =
  | "dashboard"
  | "calendar"
  | "jobs"
  | "penalties"
  | "support"
  | "settings";

export interface TradeNavItem {
  label: string;
  icon: LucideIcon;
  section: TradeSectionKey;
}

// Job status throughout lifecycle
export type TradeJobStatus = 'pending' | 'upcoming' | 'completed' | 'rejected';

// Upcoming job card data
export interface TradeUpcomingJob {
  id: number;
  title: string;
  company: string;
  location: string;
  date: string; // ISO date string (yyyy-mm-dd)
  pay: number; // daily rate in GBP
  days: number; // job duration in days
  status: TradeJobStatus;
  description?: string; // Job description/details
  actionByHours?: number; // For pending jobs: hours until decision deadline
  completedDate?: string; // For completed jobs: completion date (yyyy-mm-dd)
  rejectionReason?: string; // For rejected jobs: reason for rejection
}

// Dashboard statistics
export interface TradeDashboardStats {
  availableDays: number;
  totalDays: number;
  upcomingJobsCount: number;
  confirmedJobsCount: number;
  expectedEarnings: number;
  penaltyAmount: number;
}

// Component props
export interface TradeDashboardProps {
  onNavigateToSection: (section: TradeSectionKey) => void;
}

export interface TradeCalendarJob {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
}

export interface TradeCalendarProps {
  jobs?: TradeCalendarJob[];
}

// Penalty status throughout lifecycle
export type PenaltyStatus = 'paid' | 'unpaid' | 'disputed';

// Penalty record data
export interface TradePenalty {
  id: number;
  reason: string;
  amount: number;
  date: string; // ISO date string (yyyy-mm-dd)
  status: PenaltyStatus;
  description?: string;
  referenceJob?: string;
}

// Penalties statistics
export interface TradePenaltiesStats {
  total: number;
  paid: number;
  unpaid: number;
  disputed: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeJobsProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradePenaltiesProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeSupportProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeSettingsProps {}
