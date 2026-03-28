import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "@infra/shared-errors";
import type { CompanyService } from "../domain/company/company.service.js";
import {
  companyPathParamsSchema,
  updateCompanySchema,
} from "../security/validators/company.validators.js";
import { companyToJson } from "./company.dto.js";

export function createCompanyController(deps: { companyService: CompanyService }) {
  const { companyService } = deps;

  return {
    getCompany: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { companyId } = companyPathParamsSchema.parse(req.params);
        const company = await companyService.getCompany(companyId, req.user);
        res.status(200).json({ data: companyToJson(company) });
      } catch (err) {
        next(err);
      }
    },

    updateCompany: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { companyId } = companyPathParamsSchema.parse(req.params);
        const body = updateCompanySchema.parse(req.body);
        const company = await companyService.updateCompanyProfile(companyId, body, req.user);
        res.status(200).json({ data: companyToJson(company) });
      } catch (err) {
        next(err);
      }
    },
  };
}
