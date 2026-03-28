import { Router } from "express";
import { Permission, UserRole } from "@infra/shared-permissions";
import { ForbiddenError, NotFoundError } from "@infra/shared-errors";
import { z } from "zod";
import { authorise } from "../../../middleware/authorise.js";
import { readLimitMiddleware } from "../../../platform/security/rateLimit.js";
import { supabase } from "../../../config/supabase.js";

const penaltiesQuerySchema = z
  .object({
    status: z.enum(["pending", "charged", "waived", "disputed", "refunded"]).optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const penaltyPathSchema = z
  .object({
    penaltyId: z.string().uuid(),
  })
  .strict();

async function resolveWorkerIdForUser(userId: string): Promise<string | null> {
  const result = await supabase.from("workers").select("id").eq("user_id", userId).maybeSingle();
  if (result.error) throw result.error;
  return (result.data?.id as string | undefined) ?? null;
}

async function buildJobTitleMap(jobIds: string[]): Promise<Map<string, string>> {
  if (jobIds.length === 0) return new Map();
  const result = await supabase.from("jobs").select("id, title").in("id", jobIds);
  if (result.error) return new Map();
  const map = new Map<string, string>();
  for (const row of (result.data ?? []) as Array<{ id: string; title: string | null }>) {
    map.set(row.id, row.title ?? "Job");
  }
  return map;
}

function mapPenaltyRow(
  row: {
    id: string;
    job_id: string | null;
    fee_type: string;
    amount: number;
    reason: string | null;
    status: string;
    created_at: string;
  },
  jobsById: Map<string, string>,
) {
  return {
    id: row.id,
    reason: row.fee_type,
    amount: row.amount,
    date: row.created_at,
    status: row.status,
    description: row.reason,
    referenceJob: row.job_id ? jobsById.get(row.job_id) ?? row.job_id : undefined,
  };
}

export function createPenaltiesRouter(): Router {
  const router = Router();

  router.get("/", authorise(Permission.JOB_READ), readLimitMiddleware, async (req, res, next) => {
    try {
      if (!req.user) {
        next(new ForbiddenError("Authentication required."));
        return;
      }
      if (req.user.role === UserRole.RECRUITER) {
        next(new ForbiddenError("Recruiter access to penalties is not allowed."));
        return;
      }

      const query = penaltiesQuerySchema.parse(req.query);
      let workerId: string | null = null;

      if (req.user.role === UserRole.TRADE) {
        workerId = await resolveWorkerIdForUser(req.user.userId);
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
      if (penaltiesResult.error) throw penaltiesResult.error;

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
      const jobsById = await buildJobTitleMap(jobIds);

      res.status(200).json({
        data: rows.map((row) => mapPenaltyRow(row, jobsById)),
        meta: {
          total: penaltiesResult.count ?? rows.length,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:penaltyId", authorise(Permission.JOB_READ), readLimitMiddleware, async (req, res, next) => {
    try {
      if (!req.user) {
        next(new ForbiddenError("Authentication required."));
        return;
      }
      if (req.user.role === UserRole.RECRUITER) {
        next(new ForbiddenError("Recruiter access to penalties is not allowed."));
        return;
      }

      const { penaltyId } = penaltyPathSchema.parse(req.params);
      let workerId: string | null = null;
      if (req.user.role === UserRole.TRADE) {
        workerId = await resolveWorkerIdForUser(req.user.userId);
        if (!workerId) {
          next(new NotFoundError("Penalty not found."));
          return;
        }
      }

      let penaltyQuery = supabase
        .from("penalty_fees")
        .select("id, worker_id, job_id, fee_type, amount, reason, status, created_at")
        .eq("id", penaltyId);

      if (workerId) penaltyQuery = penaltyQuery.eq("worker_id", workerId);

      const penaltyResult = await penaltyQuery.maybeSingle();
      if (penaltyResult.error) throw penaltyResult.error;
      if (!penaltyResult.data) {
        next(new NotFoundError("Penalty not found."));
        return;
      }

      const row = penaltyResult.data as {
        id: string;
        job_id: string | null;
        fee_type: string;
        amount: number;
        reason: string | null;
        status: string;
        created_at: string;
      };
      const jobsById = await buildJobTitleMap(row.job_id ? [row.job_id] : []);

      res.status(200).json({ data: mapPenaltyRow(row, jobsById) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
