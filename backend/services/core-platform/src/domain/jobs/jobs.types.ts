export enum JobStatus {
  DRAFT = "draft",
  OPEN = "open",
  FILLED = "filled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DISPUTED = "disputed",
  RESOLVED = "resolved",
}

export type Currency = "GBP" | "USD" | "EUR";

export type Job = {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  salary: number;
  currency: Currency;
  status: JobStatus;
  assignedWorkerId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type JobStatusHistoryEntry = {
  id: string;
  jobId: string;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  actorId: string;
  reason: string | null;
  createdAt: string;
};

export type JobFilters = {
  companyId?: string;
  status?: JobStatus;
  assignedWorkerId?: string;
  limit: number;
  offset: number;
};

export type CreateJobData = {
  companyId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  salary: number;
  currency: Currency;
};

export type UpdateJobData = {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
  salary?: number;
  currency?: Currency;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
};

export type CreateJobInput = CreateJobData;
export type UpdateJobInput = UpdateJobData;
