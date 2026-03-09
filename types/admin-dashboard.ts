import type { LucideIcon } from "lucide-react";

export type SectionKey =
  | "dashboard"
  | "users"
  | "applications"
  | "appeals"
  | "support"
  | "analytics"
  | "settings";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  section: SectionKey;
}

/**
 * Appeal Status
 */
export type AppealStatus = "open" | "pending" | "closed";

/**
 * Appeal Interface
 */
export interface Appeal {
  id: string;
  userName: string;
  reason: string;
  date: string;
  status: AppealStatus;
}

/**
 * Appeal Review Form Data
 */
export interface AppealReviewData {
  appealId: string;
  title: string;
  details: string;
  date: string;
  notes: string;
  resolution: "approved" | "rejected" | "";
}

/**
 * Ticket Status
 */
export type TicketStatus = "open" | "pending" | "closed";

/**
 * Support Ticket Interface
 */
export interface Ticket {
  id: string;
  userName: string;
  subject: string;
  date: string;
  status: TicketStatus;
}

/**
 * Ticket Review Form Data
 */
export interface TicketReviewData {
  ticketId: string;
  title: string;
  details: string;
  date: string;
  notes: string;
  resolution: "resolved" | "closed" | "";
}

/**
 * User Status
 */
export type UserStatus = "active" | "suspended";

/**
 * User Type
 */
export type UserType = "trade" | "company";

/**
 * User Interface
 */
export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  joinDate: string;
}

/**
 * Admin Dashboard Metrics
 */
export interface DashboardMetric {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Tab Configuration
 */
export interface TabConfig<T extends string> {
  value: T;
  label: string;
  count: number;
}

/**
 * Modal Props Base
 */
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Review Modal Tab Type
 */
export type ReviewTab = "details" | "notes" | "attachments" | "history";