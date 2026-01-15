import type { LucideIcon } from "lucide-react";

export type TradeSectionKey =
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

export interface TradeCalendarProps {}
export interface TradeJobsProps {}
export interface TradePenaltiesProps {}
export interface TradeSupportProps {}
export interface TradeSettingsProps {}
