export type UserRole = "company" | "worker" | "admin";

export type ApiHealth = {
  service: string;
  status: "ok";
  timestamp: string;
};

export type AllocationRequest = {
  jobId: string;
  tradeId: string;
  workersNeeded: number;
  jobLocation: {
    lat: number;
    lng: number;
  };
};

export type AllocationCandidate = {
  workerId: string;
  score: number;
  reason: string;
};
