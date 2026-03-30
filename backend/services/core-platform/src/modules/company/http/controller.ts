import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "@infra/shared-errors";
import type { CompanyService } from "../application/service.js";
import {
  companyPathParamsSchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from "../contracts/validators.js";
import { companyToJson } from "../contracts/dto.js";

export function createCompanyController(deps: { companyService: CompanyService }) {
  const { companyService } = deps;

  return {
    listCompanies: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const query = listCompaniesQuerySchema.parse(req.query);
        const result = await companyService.listCompanies(
          {
            status: query.status,
            limit: query.limit,
            offset: query.offset,
          },
          req.user,
        );

        res.status(200).json({
          data: result.data.map(companyToJson),
          meta: {
            total: result.total,
            limit: query.limit,
            offset: query.offset,
          },
        });
      } catch (err) {
        next(err);
      }
    },

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
