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
