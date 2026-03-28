import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "@infra/shared-errors";
import type { AdminService } from "../application/service.js";
import {
  listCompaniesQuerySchema,
  adminCompanyStatusUpdateSchema,
  companyPathParamsSchema,
} from "../../company/contracts/validators.js";
import {
  listWorkersQuerySchema,
  adminWorkerVerificationUpdateSchema,
  workerPathParamsSchema,
} from "../../worker/contracts/validators.js";
import {
  cleanupIdempotencySchema,
  relayOutboxSchema,
  adminSettingsSchema,
  listPenaltiesQuerySchema,
} from "../contracts/validators.js";
import { companyToJson } from "../../company/contracts/dto.js";
import { workerToJson } from "../../worker/contracts/dto.js";
import { defaultAdminSettings, type AdminSettingsDto } from "../contracts/dto.js";
import { UserRole } from "@infra/shared-permissions";
import { ForbiddenError } from "@infra/shared-errors";
import { supabase } from "../../../config/supabase.js";

let inMemoryAdminSettings: AdminSettingsDto = defaultAdminSettings();

async function fetchAdminProfileGeneral(userId: string): Promise<AdminSettingsDto["general"]> {
  const [userResult, adminResult] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, email, phone_number")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("admins")
      .select("admin_level")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (userResult.error) {
    throw userResult.error;
  }
  if (adminResult.error) {
    throw adminResult.error;
  }

  const user = (userResult.data ?? null) as {
    full_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null;
  const admin = (adminResult.data ?? null) as { admin_level?: string | null } | null;

  return {
    fullName: user?.full_name ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phone_number ?? "",
    adminLevel: admin?.admin_level ?? "standard",
  };
}

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

    getSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        if (req.user.role !== UserRole.ADMIN) {
          next(new ForbiddenError("Admin permissions required."));
          return;
        }

        const generalProfile = await fetchAdminProfileGeneral(req.user.userId);
        res.status(200).json({
          data: {
            ...inMemoryAdminSettings,
            general: generalProfile,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    updateSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        if (req.user.role !== UserRole.ADMIN) {
          next(new ForbiddenError("Admin permissions required."));
          return;
        }

        const body = adminSettingsSchema.parse(req.body);
        const generalProfile = await fetchAdminProfileGeneral(req.user.userId);
        inMemoryAdminSettings = {
          ...body,
          general: generalProfile,
        };
        res.status(200).json({ data: inMemoryAdminSettings });
      } catch (err) {
        next(err);
      }
    },

    listPenalties: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }

        const query = listPenaltiesQuerySchema.parse(req.query);

        let workerId: string | null = null;
        if (req.user.role === UserRole.TRADE) {
          const workerLookup = await supabase
            .from("workers")
            .select("id")
            .eq("user_id", req.user.userId)
            .maybeSingle();

          if (workerLookup.error) {
            next(workerLookup.error);
            return;
          }

          workerId = (workerLookup.data?.id as string | undefined) ?? null;
          if (!workerId) {
            res.status(200).json({ data: [], meta: { total: 0, limit: query.limit, offset: query.offset } });
            return;
          }
        }

        let penaltiesQuery = supabase
          .from("penalty_fees")
          .select("id, worker_id, job_id, fee_type, amount, reason, status, created_at", { count: "exact" })
          .order("created_at", { ascending: false });

        if (query.status) penaltiesQuery = penaltiesQuery.eq("status", query.status);
        if (workerId) penaltiesQuery = penaltiesQuery.eq("worker_id", workerId);

        const from = query.offset;
        const to = query.offset + query.limit - 1;
        const penaltiesResult = await penaltiesQuery.range(from, to);

        if (penaltiesResult.error) {
          next(penaltiesResult.error);
          return;
        }

        const rows = (penaltiesResult.data ?? []) as Array<{
          id: string;
          job_id: string | null;
          fee_type: string;
          amount: number;
          reason: string | null;
          status: string;
          created_at: string;
        }>;

        const jobIds = Array.from(new Set(rows.map((row) => row.job_id).filter((id): id is string => Boolean(id))));
        const jobsById = new Map<string, string>();
        if (jobIds.length > 0) {
          const jobsResult = await supabase.from("jobs").select("id, title").in("id", jobIds);
          if (!jobsResult.error) {
            for (const job of (jobsResult.data ?? []) as Array<{ id: string; title: string | null }>) {
              jobsById.set(job.id, job.title ?? "Job");
            }
          }
        }

        const data = rows.map((row) => ({
          id: row.id,
          reason: row.fee_type,
          amount: row.amount,
          date: row.created_at,
          status: row.status,
          description: row.reason,
          referenceJob: row.job_id ? jobsById.get(row.job_id) ?? row.job_id : undefined,
        }));

        res.status(200).json({
          data,
          meta: {
            total: penaltiesResult.count ?? data.length,
            limit: query.limit,
            offset: query.offset,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  };
}
