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
  // Called when user clicks Create Job
  onCreateJob: () => void;
  // Optional handler for clicking a job card
  onViewJob?: (jobId: string) => void;
}

export interface CreateJobHomeProps {
  onBack?: () => void;
  onAIChat?: () => void;
  onManualForm?: () => void;
}
