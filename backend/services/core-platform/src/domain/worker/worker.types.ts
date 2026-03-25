export type WorkerVerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export type Worker = {
  id: string;
  userId: string;
  tradeId: string;
  qualifications: string | null;
  verifiedStatus: WorkerVerificationStatus;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  locationLng: number | null;
  locationLat: number | null;
  bio: string | null;
  avatarUrl: string | null;
  hourlyRate: number | null;
};

export type UpdateWorkerProfileInput = {
  qualifications?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  locationLng?: number | null;
  locationLat?: number | null;
  bio?: string | null;
  avatarUrl?: string | null;
  hourlyRate?: number | null;
  verifiedStatus?: WorkerVerificationStatus;
};

export type UpdateWorkerVerificationInput = {
  status: WorkerVerificationStatus;
  reason?: string;
};

export type ListWorkersFilters = {
  verifiedStatus?: WorkerVerificationStatus;
  limit: number;
  offset: number;
};
