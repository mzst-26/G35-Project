import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { AdminService } from "../../../src/domain/admin/admin.service.js";
import { buildCompany, createMockCompanyRepository, createMockWorkerRepository, createMockAdminRepository } from "../../helpers/mockPhase57.js";

describe("AdminService", () => {
  const adminRequester = {
    userId: "admin1",
    email: "admin@example.com",
    role: UserRole.ADMIN,
  };

  const recruiterRequester = {
    userId: "recruiter1",
    email: "recruiter@example.com",
    role: UserRole.RECRUITER,
    companyId: "company1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCompanies", () => {
    it("denies non-admin from listing all companies", async () => {
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository();
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      await expect(service.listCompanies(undefined, 10, 0, recruiterRequester as any)).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to list all companies", async () => {
      const companies = [buildCompany(), buildCompany()];
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository();
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn().mockResolvedValue(companies) };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      const result = await service.listCompanies(undefined, 10, 0, adminRequester as any);
      expect(result).toEqual(companies);
    });
  });

  describe("updateCompanyStatus", () => {
    it("denies non-admin from updating company status", async () => {
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository();
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      await expect(
        service.updateCompanyStatus("company1", "suspended", "policy violation", recruiterRequester as any),
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to update company status with before/after audit", async () => {
      const company = buildCompany();
      const updated = { ...company, accountStatus: "suspended" as const };
      const companyRepo = createMockCompanyRepository({
        findById: vi.fn().mockResolvedValue(company),
        updateStatus: vi.fn().mockResolvedValue(updated),
      });
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository({
        writeAuditLog: vi.fn().mockResolvedValue(undefined),
      });
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      const result = await service.updateCompanyStatus(company.id, "suspended", "policy violation", adminRequester as any);

      expect(result.accountStatus).toBe("suspended");
      expect(adminRepo.writeAuditLog).toHaveBeenCalledTimes(2);
    });
  });

  describe("relayOutbox", () => {
    it("denies non-admin from relaying outbox", async () => {
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository();
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      await expect(service.relayOutbox(10, recruiterRequester as any)).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to relay outbox with retry backoff", async () => {
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository({
        listDueOutbox: vi.fn().mockResolvedValue([
          {
            id: "outbox-1",
            event_type: "job.created",
            payload: { jobId: "job1" },
            status: "pending",
            retry_count: 0,
            next_attempt_at: new Date().toISOString(),
          },
          {
            id: "outbox-2",
            event_type: "company.updated",
            payload: { simulateFailure: true },
            status: "pending",
            retry_count: 0,
            next_attempt_at: new Date().toISOString(),
          },
        ]),
        markOutboxDelivered: vi.fn().mockResolvedValue(undefined),
        markOutboxRetry: vi.fn().mockResolvedValue(undefined),
        writeAuditLog: vi.fn().mockResolvedValue(undefined),
      });
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      const result = await service.relayOutbox(10, adminRequester as any);

      expect(result.processed).toBe(2);
      expect(result.delivered).toBe(1);
      expect(result.retried).toBe(1);
      expect(adminRepo.writeAuditLog).toHaveBeenCalled();
    });
  });

  describe("cleanupExpiredIdempotency", () => {
    it("denies non-admin from cleanup", async () => {
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository();
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      await expect(service.cleanupExpiredIdempotency(500, recruiterRequester as any)).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to cleanup expired idempotency records", async () => {
      const companyRepo = createMockCompanyRepository();
      const workerRepo = createMockWorkerRepository();
      const adminRepo = createMockAdminRepository({
        cleanupExpiredIdempotency: vi.fn().mockResolvedValue(42),
        writeAuditLog: vi.fn().mockResolvedValue(undefined),
      });
      const companyService = { getCompany: vi.fn(), listCompanies: vi.fn() };
      const workerService = { getWorker: vi.fn(), listWorkers: vi.fn() };

      const service = new AdminService(companyRepo, workerRepo, adminRepo, companyService as any, workerService as any);

      const result = await service.cleanupExpiredIdempotency(500, adminRequester as any);

      expect(result.deleted).toBe(42);
      expect(adminRepo.writeAuditLog).toHaveBeenCalled();
    });
  });
});
