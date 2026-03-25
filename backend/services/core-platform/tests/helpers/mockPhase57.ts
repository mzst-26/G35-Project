import { vi } from "vitest";
import type { CompanyRepository } from "../../src/repositories/company.repository.js";
import type { WorkerRepository } from "../../src/repositories/worker.repository.js";
import type { AdminRepository } from "../../src/repositories/admin.repository.js";
import type { Company } from "../../src/domain/company/company.types.js";
import type { Worker } from "../../src/domain/worker/worker.types.js";

export function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "00000000-0000-4000-8000-000000000501",
    userId: "00000000-0000-4000-8000-000000000601",
    companyName: "Acme Ltd",
    addressLine1: "1 Main Street",
    addressLine2: null,
    city: "London",
    postcode: "SW1A 1AA",
    accountStatus: "approved",
    statusChangedAt: null,
    statusChangedBy: null,
    statusReason: null,
    bio: null,
    logoUrl: null,
    website: null,
    ...overrides,
  };
}

export function buildWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: "00000000-0000-4000-8000-000000000701",
    userId: "00000000-0000-4000-8000-000000000801",
    tradeId: "00000000-0000-4000-8000-000000000901",
    qualifications: "NVQ Level 3",
    verifiedStatus: "verified",
    addressLine1: "10 Side Road",
    addressLine2: null,
    city: "Manchester",
    locationLng: -2.2426,
    locationLat: 53.4808,
    bio: null,
    avatarUrl: null,
    hourlyRate: null,
    ...overrides,
  };
}

export function createMockCompanyRepository(overrides: Partial<CompanyRepository> = {}): CompanyRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    updateProfile: vi.fn(),
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    updateStatus: vi.fn(),
    ...overrides,
  };
}

export function createMockWorkerRepository(overrides: Partial<WorkerRepository> = {}): WorkerRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    updateProfile: vi.fn(),
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    updateVerificationStatus: vi.fn(),
    ...overrides,
  };
}

export function createMockAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    listDueOutbox: vi.fn().mockResolvedValue([]),
    markOutboxDelivered: vi.fn().mockResolvedValue(undefined),
    markOutboxRetry: vi.fn().mockResolvedValue(undefined),
    markOutboxDeadLetter: vi.fn().mockResolvedValue(undefined),
    cleanupExpiredIdempotency: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}
