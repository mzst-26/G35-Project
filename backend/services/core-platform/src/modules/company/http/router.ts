import { Router } from "express";
import { Permission } from "@infra/shared-permissions";
import { authorise } from "../../../middleware/authorise.js";
import { readLimitMiddleware, writeLimitMiddleware } from "../../../platform/security/rateLimit.js";
import { createCompanyController } from "./controller.js";
import type { CompanyService } from "../application/service.js";

export type CompanyRouterDeps = {
  companyService: CompanyService;
};

export function createCompanyRouter(deps: CompanyRouterDeps): Router {
  const router = Router();
  const c = createCompanyController(deps);

  router.get("/", authorise(Permission.COMPANY_READ), readLimitMiddleware, (req, res, next) => {
    void c.listCompanies(req, res, next);
  });

  router.get("/:companyId", authorise(Permission.COMPANY_READ), readLimitMiddleware, (req, res, next) => {
    void c.getCompany(req, res, next);
  });

  router.patch("/:companyId", authorise(Permission.COMPANY_WRITE), writeLimitMiddleware, (req, res, next) => {
    void c.updateCompany(req, res, next);
  });

  return router;
}
