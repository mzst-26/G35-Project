import type { AuthenticatedUser } from "@infra/shared-auth";
import { ForbiddenError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { WorkerNotFoundError } from "../../../errors/index.js";
import type {
  ListWorkersFilters,
  UpdateWorkerProfileInput,
  Worker,
} from "../domain/types.js";
import type { WorkerRepository } from "../infrastructure/repository.js";

export class WorkerService {
  constructor(private readonly workers: WorkerRepository) {}

  async getWorker(workerId: string, requester: AuthenticatedUser): Promise<Worker> {
    const worker = await this.workers.findById(workerId);
    if (!worker) {
      throw new WorkerNotFoundError(workerId);
    }
    this.assertCanRead(worker.id, requester);
    return worker;
  }

  async updateWorkerProfile(workerId: string, input: UpdateWorkerProfileInput, requester: AuthenticatedUser): Promise<Worker> {
    const worker = await this.workers.findById(workerId);
    if (!worker) {
      throw new WorkerNotFoundError(workerId);
    }

    this.assertCanWrite(worker.id, requester);

    if (input.verifiedStatus !== undefined && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Only admins can update worker verification status.");
    }

    return this.workers.updateProfile(workerId, input);
  }

  async listWorkers(
    filters: ListWorkersFilters,
    requester: AuthenticatedUser,
  ): Promise<{ data: Worker[]; total: number }> {
    if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Only admins can list workers.");
    }
    return this.workers.list(filters);
  }

  private assertCanRead(workerId: string, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }

    if (requester.role === UserRole.TRADE) {
      if (!requester.workerId || requester.workerId !== workerId) {
        throw new ForbiddenError("You cannot access this worker profile.");
      }
      return;
    }

    throw new ForbiddenError("Insufficient permissions.");
  }

  private assertCanWrite(workerId: string, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }

    if (requester.role === UserRole.TRADE) {
      if (!requester.workerId || requester.workerId !== workerId) {
        throw new ForbiddenError("You cannot modify this worker profile.");
      }
      return;
    }

    throw new ForbiddenError("Insufficient permissions.");
  }
}
