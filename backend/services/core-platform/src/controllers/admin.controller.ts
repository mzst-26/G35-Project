import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "@infra/shared-errors";
import type { AdminService } from "../domain/admin/admin.service.js";
import {
  listCompaniesQuerySchema,
  adminCompanyStatusUpdateSchema,
  companyPathParamsSchema,
} from "../security/validators/company.validators.js";
import {
  listWorkersQuerySchema,
  adminWorkerVerificationUpdateSchema,
  workerPathParamsSchema,
} from "../security/validators/worker.validators.js";
import {
  cleanupIdempotencySchema,
  relayOutboxSchema,
} from "../security/validators/admin.validators.js";
import { companyToJson } from "./company.dto.js";
import { workerToJson } from "./worker.dto.js";

export function createAdminController(deps: { adminService: AdminService }) {
  const { adminService } = deps;

  return {
    listCompanies: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const query = listCompaniesQuerySchema.parse(req.query);
        const result = await adminService.listCompanies(query.status, query.limit, query.offset, req.user);
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

    updateCompanyStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const { companyId } = companyPathParamsSchema.parse(req.params);
        const body = adminCompanyStatusUpdateSchema.parse(req.body);
        const updated = await adminService.updateCompanyStatus(companyId, body.status, body.reason, req.user);
        res.status(200).json({ data: companyToJson(updated) });
      } catch (err) {
        next(err);
      }
    },

    listWorkers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const query = listWorkersQuerySchema.parse(req.query);
        const result = await adminService.listWorkers(query.verifiedStatus, query.limit, query.offset, req.user);
        res.status(200).json({
          data: result.data.map(workerToJson),
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

    updateWorkerVerification: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const { workerId } = workerPathParamsSchema.parse(req.params);
        const body = adminWorkerVerificationUpdateSchema.parse(req.body);
        const updated = await adminService.updateWorkerVerificationStatus(workerId, body.status, body.reason, req.user);
        res.status(200).json({ data: workerToJson(updated) });
      } catch (err) {
        next(err);
      }
    },

    relayOutbox: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const body = relayOutboxSchema.parse(req.body);
        const result = await adminService.relayOutbox(body.limit, req.user);
        res.status(200).json({ data: result });
      } catch (err) {
        next(err);
      }
    },

    cleanupIdempotency: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const body = cleanupIdempotencySchema.parse(req.body);
        const result = await adminService.cleanupExpiredIdempotency(body.limit, req.user);
        res.status(200).json({ data: result });
      } catch (err) {
        next(err);
      }
    },
  };
}
