import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "@infra/shared-errors";
import { uuidV4Schema } from "@infra/shared-validation";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { JobsService } from "../application/service.js";
import type { IdempotencyRepository } from "../../../platform/persistence/idempotency.repository.js";
import {
  createJobSchema,
  listJobsQuerySchema,
  transitionStatusSchema,
  updateJobSchema,
} from "../contracts/validators.js";
import { jobToJson } from "../contracts/dto.js";

export const POST_JOBS_IDEMPOTENCY_ROUTE = "POST:/api/v1/jobs";
export const POST_JOB_STATUS_IDEMPOTENCY_ROUTE = "POST:/api/v1/jobs/:id/status";

const paramsSchema = z.object({ id: uuidV4Schema }).strict();

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of entries) {
      out[key] = canonicalize(nested);
    }
    return out;
  }
  return value;
}

function requestFingerprint(payload: unknown): string {
  const serialized = JSON.stringify(canonicalize(payload));
  return createHash("sha256").update(serialized).digest("hex");
}

function parseIdempotencyKey(rawHeader: string | string[] | undefined): string | undefined {
  if (rawHeader === undefined) {
    return undefined;
  }
  if (Array.isArray(rawHeader)) {
    return uuidV4Schema.parse(rawHeader[0]);
  }
  return uuidV4Schema.parse(rawHeader);
}

export function createJobsController(deps: { jobsService: JobsService; idempotencyRepository: IdempotencyRepository }) {
  const { jobsService, idempotencyRepository } = deps;

  return {
    listJobs: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const query = listJobsQuerySchema.parse(req.query);
        const result = await jobsService.listJobs(
          {
            companyId: query.companyId,
            status: query.status,
            limit: query.limit,
            offset: query.offset,
          },
          req.user,
        );
        res.status(200).json({
          data: result.data.map(jobToJson),
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

    createJob: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const body = createJobSchema.parse(req.body);

        const idempotencyKey = parseIdempotencyKey(req.headers["idempotency-key"]);
        const idemContext = idempotencyKey
          ? {
              key: idempotencyKey,
              actorId: req.user.userId,
              method: "POST",
              canonicalRoute: POST_JOBS_IDEMPOTENCY_ROUTE,
              requestHash: requestFingerprint({ route: POST_JOBS_IDEMPOTENCY_ROUTE, body }),
            }
          : null;
        if (idemContext) {
          const cached = await idempotencyRepository.find(idemContext);
          if (cached) {
            res.status(cached.statusCode).json(cached.responseBody);
            return;
          }
        }

        const job = await jobsService.createJob(body, req.user);
        const payload = { data: jobToJson(job) };
        if (idemContext) {
          await idempotencyRepository.save(idemContext, 201, payload);
        }
        res.status(201).json(payload);
      } catch (err) {
        next(err);
      }
    },

    getJob: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { id } = paramsSchema.parse(req.params);
        const job = await jobsService.getJob(id, req.user);
        res.status(200).json({ data: jobToJson(job) });
      } catch (err) {
        next(err);
      }
    },

    updateJob: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { id } = paramsSchema.parse(req.params);
        const body = updateJobSchema.parse(req.body);
        const job = await jobsService.updateJob(id, body, req.user);
        res.status(200).json({ data: jobToJson(job) });
      } catch (err) {
        next(err);
      }
    },

    transitionStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { id } = paramsSchema.parse(req.params);
        const body = transitionStatusSchema.parse(req.body);
        const idempotencyKey = parseIdempotencyKey(req.headers["idempotency-key"]);
        const idempotencyRoute = `${POST_JOB_STATUS_IDEMPOTENCY_ROUTE}:${id}`;
        const idemContext = idempotencyKey
          ? {
              key: idempotencyKey,
              actorId: req.user.userId,
              method: "POST",
              canonicalRoute: idempotencyRoute,
              requestHash: requestFingerprint({ route: idempotencyRoute, body }),
            }
          : null;

        if (idemContext) {
          const cached = await idempotencyRepository.find(idemContext);
          if (cached) {
            res.status(cached.statusCode).json(cached.responseBody);
            return;
          }
        }

        const job = await jobsService.transitionStatus(
          id,
          body.status,
          req.user,
          body.version,
          body.reason,
        );
        const payload = { data: jobToJson(job) };
        if (idemContext) {
          await idempotencyRepository.save(idemContext, 200, payload);
        }
        res.status(200).json(payload);
      } catch (err) {
        next(err);
      }
    },
  };
}
