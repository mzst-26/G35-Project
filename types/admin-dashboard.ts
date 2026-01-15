import type { LucideIcon } from "lucide-react";

export type SectionKey =
  | "dashboard"
  | "users"
  | "appeals"
  | "support"
  | "analytics"
  | "settings";

  export interface NavItem { 
    label: string;
    icon: LucideIcon;
    section: SectionKey;
  }

   