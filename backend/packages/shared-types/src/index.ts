export type UserRole = "admin" | "recruiter" | "trade";

export type Permission =
  | "jobs:read"
  | "jobs:create"
  | "jobs:update"
  | "jobs:delete"
  | "applications:read"
  | "applications:create"
  | "applications:approve"
  | "applications:reject"
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:ban"
  | "payments:read"
  | "payments:initiate"
  | "penalties:read"
  | "penalties:issue"
  | "admin:settings:read"
  | "admin:settings:update"
  | "admin:analytics:read"
  | "support:tickets:read"
  | "support:tickets:reply"
  | "support:tickets:close"
  | "appeals:read"
  | "appeals:submit"
  | "appeals:resolve";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  stepUpVerified: boolean;
  expiresAt: number;
};

export type Session = {
  sessionId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  stepUpVerified: boolean;
  ipAddress: string | null;
  userAgentHash: string | null;
};

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
