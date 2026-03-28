import type { JobStatus } from "../jobs/jobs.types.js";

export type WorkerAvailability = {
  id: string;
  workerId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  recurring: boolean;
  available: boolean;
  locked: boolean;
  originalAvailability: boolean | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type DateRangeFilter = {
  from?: Date;
  to?: Date;
};

export type DateRange = {
  start: Date;
  end: Date;
};

export type CreateAvailabilityInput = {
  date: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
};

export type UpdateAvailabilityInput = {
  date?: string;
  startTime?: string;
  endTime?: string;
  recurring?: boolean;
  available?: boolean;
  version: number;
};

export type OverlappingJob = {
  id: string;
  status: JobStatus;
  startAt: Date;
};

export type AuditEntry = {
  action: "create" | "update" | "delete";
  actorId: string;
  workerId: string;
  availabilityId: string;
  requestId?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
};
