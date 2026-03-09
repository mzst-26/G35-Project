/**
 * Application Review Status
 */
export type ApplicationStatus = "pending" | "approved" | "rejected";

/**
 * Application Decision Resolution
 */
export type ApplicationDecision = "approved" | "rejected";

/**
 * Application Type
 */
export type ApplicationType = "recruiter" | "trade";

/**
 * Recruiter Application Details
 */
export interface RecruiterApplicationDetails {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
}

/**
 * Trade Application Details
 */
export interface TradeApplicationDetails {
  name: string;
  occupation: string;
  address: string;
  references: string;
  qualificationsFileName: string;
  photosCount: number;
}

/**
 * Registration Application
 */
export interface RegistrationApplication {
  id: string;
  applicantName: string;
  type: ApplicationType;
  submittedAt: string;
  status: ApplicationStatus;
  recruiterDetails?: RecruiterApplicationDetails;
  tradeDetails?: TradeApplicationDetails;
  adminReason?: string;
}

/**
 * Application Review Form Data
 */
export interface ApplicationReviewData {
  applicationId: string;
  resolution: ApplicationDecision;
  reason: string;
}
