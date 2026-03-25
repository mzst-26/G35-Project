import type { AuthenticatedUser } from "@infra/shared-auth";
import { ForbiddenError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { getRequestId, securityEvents } from "@infra/shared-observability";
import type { CompanyService } from "../company/company.service.js";
import type { WorkerService } from "../worker/worker.service.js";
import type { CleanupResult, RelayResult } from "./admin.types.js";
import type { CompanyStatus } from "../company/company.types.js";
import type { WorkerVerificationStatus } from "../worker/worker.types.js";
import type { CompanyRepository } from "../../repositories/company.repository.js";
import type { WorkerRepository } from "../../repositories/worker.repository.js";
import type { AdminRepository } from "../../repositories/admin.repository.js";
import { CompanyNotFoundError, WorkerNotFoundError } from "../../errors/index.js";

const MAX_OUTBOX_RETRIES = 3;

export class AdminService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly workers: WorkerRepository,
    private readonly adminRepository: AdminRepository,
    private readonly companyService: CompanyService,
    private readonly workerService: WorkerService,
  ) {}

  async listCompanies(status: CompanyStatus | undefined, limit: number, offset: number, requester: AuthenticatedUser) {
    this.assertAdmin(requester);
    return this.companyService.listCompanies({ status, limit, offset }, requester);
  }

  async listWorkers(status: WorkerVerificationStatus | undefined, limit: number, offset: number, requester: AuthenticatedUser) {
    this.assertAdmin(requester);
    return this.workerService.listWorkers({ verifiedStatus: status, limit, offset }, requester);
  }

  async updateCompanyStatus(
    companyId: string,
    status: CompanyStatus,
    reason: string | undefined,
    requester: AuthenticatedUser,
  ) {
    this.assertAdmin(requester);
    const before = await this.companies.findById(companyId);
    if (!before) {
      throw new CompanyNotFoundError(companyId);
    }

    await this.adminRepository.writeAuditLog({
      eventName: "admin.company.status.before",
      actorId: requester.userId,
      role: requester.role,
      metadata: {
        companyId,
        before,
        requestId: getRequestId(),
      },
    });

    const updated = await this.companies.updateStatus(companyId, status, requester.userId, reason);

    await this.adminRepository.writeAuditLog({
      eventName: "admin.company.status.after",
      actorId: requester.userId,
      role: requester.role,
      metadata: {
        companyId,
        after: updated,
        requestId: getRequestId(),
      },
    });

    securityEvents.emit("admin.override.used", {
      adminId: requester.userId,
      targetId: companyId,
      action: `company.status_override.${status}`,
      requestId: getRequestId(),
    });

    return updated;
  }

  async updateWorkerVerificationStatus(
    workerId: string,
    status: WorkerVerificationStatus,
    reason: string | undefined,
    requester: AuthenticatedUser,
  ) {
    this.assertAdmin(requester);
    const before = await this.workers.findById(workerId);
    if (!before) {
      throw new WorkerNotFoundError(workerId);
    }

    await this.adminRepository.writeAuditLog({
      eventName: "admin.worker.verification.before",
      actorId: requester.userId,
      role: requester.role,
      metadata: {
        workerId,
        before,
        reason: reason ?? null,
        requestId: getRequestId(),
      },
    });

    const updated = await this.workers.updateVerificationStatus(workerId, status);

    await this.adminRepository.writeAuditLog({
      eventName: "admin.worker.verification.after",
      actorId: requester.userId,
      role: requester.role,
      metadata: {
        workerId,
        after: updated,
        requestId: getRequestId(),
      },
    });

    securityEvents.emit("admin.override.used", {
      adminId: requester.userId,
      targetId: workerId,
      action: `worker.verification_override.${status}`,
      requestId: getRequestId(),
    });

    return updated;
  }

  async relayOutbox(limit: number, requester: AuthenticatedUser): Promise<RelayResult> {
    this.assertAdmin(requester);
    const rows = await this.adminRepository.listDueOutbox(limit);

    let delivered = 0;
    let retried = 0;
    let deadLettered = 0;

    for (const row of rows) {
      const shouldFail = row.payload?.simulateFailure === true;
      if (!shouldFail) {
        await this.adminRepository.markOutboxDelivered(row.id);
        delivered += 1;
        continue;
      }

      const nextRetryCount = row.retry_count + 1;
      const errorMessage = "Simulated relay failure";
      if (nextRetryCount >= MAX_OUTBOX_RETRIES) {
        await this.adminRepository.markOutboxDeadLetter(row.id, nextRetryCount, errorMessage);
        deadLettered += 1;
      } else {
        const delaySeconds = Math.pow(2, nextRetryCount) * 30;
        const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        await this.adminRepository.markOutboxRetry(row.id, nextRetryCount, nextAttemptAt, errorMessage);
        retried += 1;
      }
    }

    const result = {
      processed: rows.length,
      delivered,
      retried,
      deadLettered,
    };

    await this.adminRepository.writeAuditLog({
      eventName: "admin.outbox.relay.executed",
      actorId: requester.userId,
      role: requester.role,
      metadata: {
        result,
        requestId: getRequestId(),
      },
    });

    return result;
  }

  async cleanupExpiredIdempotency(limit: number, requester: AuthenticatedUser): Promise<CleanupResult> {
    this.assertAdmin(requester);
    const deleted = await this.adminRepository.cleanupExpiredIdempotency(limit);

    await this.adminRepository.writeAuditLog({
      eventName: "admin.idempotency.cleanup.executed",
      actorId: requester.userId,
      role: requester.role,
      metadata: {
        deleted,
        requestId: getRequestId(),
      },
    });

    return { deleted };
  }

  private assertAdmin(requester: AuthenticatedUser): void {
    if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Admin permissions required.");
    }
  }
}
