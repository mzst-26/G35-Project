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
  requesterFullName: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterRoleTitle: string;
  officeAddressLine1: string;
  officeAddressLine2?: string | null;
  officeCity: string;
  officePostcode: string;
  companyWebsite?: string | null;
  requestedSeatCount: number;
  hasInternalApprover: boolean;
  internalApproverFullName?: string | null;
  internalApproverEmail?: string | null;
  contractSignerSameAsRequester: boolean;
  contractSignerFullName?: string | null;
  contractSignerEmail?: string | null;
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
  updatedAt?: string;
  status: ApplicationStatus;
  recruiterDetails?: RecruiterApplicationDetails;
  tradeDetails?: TradeApplicationDetails;
  adminReason?: string;
  reviewedAt?: string | null;
  reviewedByAdminUserId?: string | null;
}

/**
 * Application Review Form Data
 */
export interface ApplicationReviewData {
  applicationId: string;
  resolution: ApplicationDecision;
  reason: string;
}

export interface RecruiterRegistrationApiRecord {
  id: string;
  status: ApplicationStatus | "withdrawn";
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedByAdminUserId: string | null;
  reviewReason: string | null;
  requesterFullName: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterRoleTitle: string;
  companyName: string;
  officeAddressLine1: string;
  officeAddressLine2: string | null;
  officeCity: string;
  officePostcode: string;
  companyWebsite: string | null;
  requestedSeatCount: number;
  hasInternalApprover: boolean;
  internalApproverFullName: string | null;
  internalApproverEmail: string | null;
  contractSignerSameAsRequester: boolean;
  contractSignerFullName: string | null;
  contractSignerEmail: string | null;
}
