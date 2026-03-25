import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorisedError } from "@infra/shared-errors";
import { uuidV4Schema } from "@infra/shared-validation";
import { UserRole } from "@infra/shared-permissions";
import { createHash } from "node:crypto";
import type { CalendarService } from "../domain/calendar/calendar.service.js";
import type { IdempotencyRepository } from "../repositories/idempotency.repository.js";
import { availabilityToJson } from "./calendar.dto.js";
import {
  availabilityPathParamsSchema,
  calendarPathParamsSchema,
  createAvailabilitySchema,
  deleteAvailabilitySchema,
  listAvailabilityQuerySchema,
  updateAvailabilitySchema,
} from "../security/validators/calendar.validators.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    for (const [k, v] of entries) out[k] = canonicalize(v);
    return out;
  }
  return value;
}

function requestFingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");
}

function parseIdempotencyKey(rawHeader: string | string[] | undefined): string | undefined {
  if (rawHeader === undefined) return undefined;
  if (Array.isArray(rawHeader)) return uuidV4Schema.parse(rawHeader[0]);
  return uuidV4Schema.parse(rawHeader);
}

function assertWorkerPathAccess(req: Request, workerId: string): void {
  if (!req.user) {
    throw new UnauthorisedError("Authentication required.");
  }

  if (req.user.role === UserRole.ADMIN) {
    return;
  }

  if (!req.user.workerId || req.user.workerId !== workerId) {
    throw new ForbiddenError("You can only access your own calendar.");
  }
}

export function createCalendarController(deps: {
  calendarService: CalendarService;
  idempotencyRepository: IdempotencyRepository;
}) {
  const { calendarService, idempotencyRepository } = deps;

  return {
    listAvailability: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { workerId } = calendarPathParamsSchema.parse(req.params);
        assertWorkerPathAccess(req, workerId);
        const query = listAvailabilityQuerySchema.parse(req.query);

        const result = await calendarService.listAvailability(
          workerId,
          req.user!,
          {
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
          },
        );

        res.status(200).json({ data: result.map(availabilityToJson) });
      } catch (err) {
        next(err);
      }
    },

    createAvailability: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { workerId } = calendarPathParamsSchema.parse(req.params);
        assertWorkerPathAccess(req, workerId);
        const body = createAvailabilitySchema.parse(req.body);

        const route = `POST:/api/v1/calendar/:workerId/availability:${workerId}`;
        const key = parseIdempotencyKey(req.headers["idempotency-key"]);
        const idemContext = key
          ? {
              key,
              actorId: req.user!.userId,
              method: "POST",
              canonicalRoute: route,
              requestHash: requestFingerprint({ route, body }),
            }
          : null;

        if (idemContext) {
          const cached = await idempotencyRepository.find(idemContext);
          if (cached) {
            res.status(cached.statusCode).json(cached.responseBody);
            return;
          }
        }

        const created = await calendarService.createAvailability(workerId, body, req.user!);
        const payload = { data: availabilityToJson(created) };
        if (idemContext) {
          await idempotencyRepository.save(idemContext, 201, payload);
        }
        res.status(201).json(payload);
      } catch (err) {
        next(err);
      }
    },

    updateAvailability: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { workerId, id } = availabilityPathParamsSchema.parse(req.params);
        assertWorkerPathAccess(req, workerId);
        const body = updateAvailabilitySchema.parse(req.body);

        const route = `PATCH:/api/v1/calendar/:workerId/availability/:id:${workerId}:${id}`;
        const key = parseIdempotencyKey(req.headers["idempotency-key"]);
        const idemContext = key
          ? {
              key,
              actorId: req.user!.userId,
              method: "PATCH",
              canonicalRoute: route,
              requestHash: requestFingerprint({ route, body }),
            }
          : null;

        if (idemContext) {
          const cached = await idempotencyRepository.find(idemContext);
          if (cached) {
            res.status(cached.statusCode).json(cached.responseBody);
            return;
          }
        }

        const updated = await calendarService.updateAvailability(workerId, id, body, req.user!);
        const payload = { data: availabilityToJson(updated) };
        if (idemContext) {
          await idempotencyRepository.save(idemContext, 200, payload);
        }
        res.status(200).json(payload);
      } catch (err) {
        next(err);
      }
    },

    deleteAvailability: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { workerId, id } = availabilityPathParamsSchema.parse(req.params);
        assertWorkerPathAccess(req, workerId);
        const query = deleteAvailabilitySchema.parse(req.query);

        const route = `DELETE:/api/v1/calendar/:workerId/availability/:id:${workerId}:${id}`;
        const key = parseIdempotencyKey(req.headers["idempotency-key"]);
        const idemContext = key
          ? {
              key,
              actorId: req.user!.userId,
              method: "DELETE",
              canonicalRoute: route,
              requestHash: requestFingerprint({ route, query }),
            }
          : null;

        if (idemContext) {
          const cached = await idempotencyRepository.find(idemContext);
          if (cached) {
            res.status(cached.statusCode).json(cached.responseBody);
            return;
          }
        }

        await calendarService.deleteAvailability(workerId, id, query.version, req.user!);
        const payload = { data: { id, deleted: true } };
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
