import type { LucideIcon } from "lucide-react";

export type SectionKey =
  | "dashboard"
  | "create-job"
  | "payments"
  | "support"
  | "settings";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  section: SectionKey;
}
export interface DashboardHomeProps {
  onCreateJob: () => void;
}

export interface CreateJobHomeProps {
  onBack?: () => void;
  onAIChat?: () => void;
  onManualForm?: () => void;
}
