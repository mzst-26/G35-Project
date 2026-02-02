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

// Job status for upcoming jobs
export type TradeJobStatus = 'confirmed' | 'pending';

// Upcoming job card data
export interface TradeUpcomingJob {
  id: number;
  title: string;
  company: string;
  location: string;
  date: string; // ISO date string (yyyy-mm-dd)
  pay: number; // daily rate in GBP
  status: TradeJobStatus;
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeCalendarProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeJobsProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradePenaltiesProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeSupportProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TradeSettingsProps {}
