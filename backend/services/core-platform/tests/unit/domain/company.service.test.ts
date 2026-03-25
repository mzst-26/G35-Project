import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@infra/shared-errors";
import { CompanyService } from "../../../src/domain/company/company.service.js";
import { CompanyNotFoundError } from "../../../src/errors/index.js";
import { buildCompany, createMockCompanyRepository } from "../../helpers/mockPhase57.js";

describe("CompanyService", () => {
  it("allows recruiter to read own company", async () => {
    const company = buildCompany();
    const repo = createMockCompanyRepository({
      findById: vi.fn().mockResolvedValue(company),
    });
    const service = new CompanyService(repo);

    const result = await service.getCompany(company.id, {
      userId: "u1",
      email: "rec@example.com",
      role: "recruiter",
      companyId: company.id,
    });

    expect(result.id).toBe(company.id);
  });

  it("denies recruiter reading another company", async () => {
    const company = buildCompany();
    const repo = createMockCompanyRepository({
      findById: vi.fn().mockResolvedValue(company),
    });
    const service = new CompanyService(repo);

    await expect(
      service.getCompany(company.id, {
        userId: "u1",
        email: "rec@example.com",
        role: "recruiter",
        companyId: "00000000-0000-4000-8000-000000000999",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies profile update for suspended recruiter company", async () => {
    const company = buildCompany({ accountStatus: "suspended" });
    const repo = createMockCompanyRepository({
      findById: vi.fn().mockResolvedValue(company),
    });
    const service = new CompanyService(repo);

    await expect(
      service.updateCompanyProfile(
        company.id,
        { city: "Leeds" },
        {
          userId: "u1",
          email: "rec@example.com",
          role: "recruiter",
          companyId: company.id,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws not found when company does not exist", async () => {
    const repo = createMockCompanyRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new CompanyService(repo);

    await expect(
      service.getCompany("00000000-0000-4000-8000-000000000501", {
        userId: "u1",
        email: "admin@example.com",
        role: "admin",
      }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
  });
});
