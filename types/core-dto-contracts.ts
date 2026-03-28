export const CORE_DTO_CONTRACT_VERSION = "2026-03-26.cp002.v1" as const;

export type RequestId = string;
export type IsoTimestamp = string;
export type Uuid = string;

export interface ApiErrorIssue {
  field: string;
  message: string;
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  requestId: RequestId;
  timestamp: IsoTimestamp;
  issues?: ApiErrorIssue[];
}

export interface CursorPaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  total?: number;
  limit?: number;
  offset?: number;
}

export type CoreJobStatusCurrent = "draft" | "open" | "closed";
export type CoreJobStatusTarget = "draft" | "pending_quote" | "quoted" | "pending_payment" | "paid" | "allocating" | "allocated" | "in_progress" | "completed" | "cancelled";

export interface CreateJobRequestDto {
  title: string;
  description?: string;
  status?: CoreJobStatusCurrent;
}

export interface UpdateJobRequestDto {
  title?: string;
  description?: string;
  status?: CoreJobStatusCurrent;
}

export interface JobListItemDto {
  id: Uuid;
  title: string;
  description?: string;
  status: CoreJobStatusCurrent | CoreJobStatusTarget;
  companyId?: Uuid;
  workerId?: Uuid | null;
  tradeId?: Uuid;
  startAt?: IsoTimestamp | null;
  endAt?: IsoTimestamp | null;
  createdAt?: IsoTimestamp;
  updatedAt?: IsoTimestamp;
}

export interface JobDetailDto extends JobListItemDto {
  location?: string;
  address?: string;
  workersNeeded?: number;
  dailyRate?: number;
  platformFee?: number;
  labourCost?: number;
  totalCost?: number;
}

export interface JobStatusTransitionRequestDto {
  toStatus: CoreJobStatusCurrent | CoreJobStatusTarget;
  reason?: string;
}

export interface JobStatusTransitionResponseDto {
  id: Uuid;
  previousStatus: string;
  nextStatus: string;
  changedAt: IsoTimestamp;
}

export interface CalendarAvailabilityDto {
  id: Uuid;
  workerId: Uuid;
  date: string;
  isAvailable: boolean;
  note?: string;
  createdAt?: IsoTimestamp;
  updatedAt?: IsoTimestamp;
}

export interface CreateAvailabilityRequestDto {
  date: string;
  isAvailable: boolean;
  note?: string;
}

export interface UpdateAvailabilityRequestDto {
  isAvailable?: boolean;
  note?: string;
}

export interface CompanyProfileDto {
  id: Uuid;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  createdAt?: IsoTimestamp;
  updatedAt?: IsoTimestamp;
}

export interface UpdateCompanyProfileRequestDto {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
}

export interface WorkerProfileDto {
  id: Uuid;
  userId?: Uuid;
  displayName?: string;
  email?: string;
  phone?: string;
  verified?: boolean;
  tradeId?: Uuid;
  createdAt?: IsoTimestamp;
  updatedAt?: IsoTimestamp;
}

export interface UpdateWorkerProfileRequestDto {
  displayName?: string;
  phone?: string;
  tradeId?: Uuid;
}

export interface CompanyPaymentListItemDto {
  id: Uuid;
  jobId: Uuid;
  jobTitle: string;
  status: "unpaid" | "platform-fee-paid" | "stripe-hold" | "released" | "refunded";
  date: string;
  invoice: string;
  paymentMethod?: string | null;
  labourCost: number;
  platformFee: number;
  totalAmount: number;
}

export interface CompanyPaymentDetailDto extends CompanyPaymentListItemDto {
  createdAt: IsoTimestamp;
  paidAt?: IsoTimestamp | null;
  releasedAt?: IsoTimestamp | null;
  platformFeePaid?: boolean;
  labourCostHeld?: boolean;
}

export interface CompanyPaymentSummaryDto {
  totalPaid: number;
  totalInStripeHold: number;
  unpaidJobs: number;
  platformFeesPaid: number;
}

export interface TradePenaltyDto {
  id: Uuid;
  reason: string;
  amount: number;
  date: string;
  status: "paid" | "unpaid" | "disputed";
  description?: string;
  referenceJob?: string;
}

export interface TradePenaltySummaryDto {
  total: number;
  paid: number;
  unpaid: number;
  disputed: number;
}

export interface AdminSettingsDto {
  general: {
    fullName: string;
    email: string;
    phoneNumber: string;
    adminLevel: string;
  };
  notifications: {
    emailNotifications: boolean;
    newUserAlerts: boolean;
    appealAlerts: boolean;
    supportTicketAlerts: boolean;
    systemAlerts: boolean;
  };
  payments: {
    platformFeePercent: number | null;
    lateCancellationFee: number | null;
    noShowFee: number | null;
    lateArrivalFee: number | null;
  };
  jobs: {
    maxJobsPerTrade: number | null;
    jobCancellationWindowHours: number | null;
  };
  users: {
    autoSuspensionThreshold: number | null;
  };
}

export type UpdateAdminSettingsRequestDto = AdminSettingsDto;

export interface SupportTicketDto {
  id: Uuid;
  title: string;
  details: string;
  date: string;
  status: "open" | "pending" | "closed";
  createdAt: IsoTimestamp;
}

export interface CreateSupportTicketRequestDto {
  title: string;
  details: string;
  date: string;
}

export interface ReviewRegistrationDecisionRequestDto {
  decision: "approve" | "reject";
  reason?: string;
}
