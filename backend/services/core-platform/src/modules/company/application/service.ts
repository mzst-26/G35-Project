import type { AuthenticatedUser } from "@infra/shared-auth";
import { ForbiddenError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { getRequestId, securityEvents } from "@infra/shared-observability";
import { CompanyNotFoundError } from "../../../errors/index.js";
import type {
  Company,
  ListCompaniesFilters,
  UpdateCompanyProfileInput,
} from "../domain/types.js";
import type { CompanyRepository } from "../infrastructure/repository.js";

export class CompanyService {
  constructor(private readonly companies: CompanyRepository) {}

  async getCompany(companyId: string, requester: AuthenticatedUser): Promise<Company> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError(companyId);
    }
    this.assertCanRead(company.id, requester);
    return company;
  }

  async updateCompanyProfile(
    companyId: string,
    input: UpdateCompanyProfileInput,
    requester: AuthenticatedUser,
  ): Promise<Company> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError(companyId);
    }

    this.assertCanWrite(company.id, requester);

    if (requester.role === UserRole.RECRUITER && company.accountStatus === "suspended") {
      securityEvents.emit("company.profile.suspended_action_attempt", {
        companyId,
        userId: requester.userId,
        requestId: getRequestId(),
      });
      throw new ForbiddenError("Suspended company accounts cannot update profile details.");
    }

    return this.companies.updateProfile(companyId, input);
  }

  async listCompanies(
    filters: ListCompaniesFilters,
    requester: AuthenticatedUser,
  ): Promise<{ data: Company[]; total: number }> {
    if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Only admins can list companies.");
    }
    return this.companies.list(filters);
  }

  private assertCanRead(companyId: string, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }

    if (requester.role === UserRole.RECRUITER) {
      if (!requester.companyId || requester.companyId !== companyId) {
        throw new ForbiddenError("You cannot access this company.");
      }
      return;
    }

    throw new ForbiddenError("Insufficient permissions.");
  }

  private assertCanWrite(companyId: string, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }

    if (requester.role === UserRole.RECRUITER) {
      if (!requester.companyId || requester.companyId !== companyId) {
        throw new ForbiddenError("You cannot modify this company.");
      }
      return;
    }

    throw new ForbiddenError("Insufficient permissions.");
  }
}
