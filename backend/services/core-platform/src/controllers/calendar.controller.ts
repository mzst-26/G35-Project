import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorisedError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import type { CalendarService } from "../domain/calendar/calendar.service.js";
import { availabilityToJson } from "./calendar.dto.js";
import {
  availabilityPathParamsSchema,
  calendarPathParamsSchema,
  createAvailabilitySchema,
  deleteAvailabilitySchema,
  listAvailabilityQuerySchema,
  updateAvailabilitySchema,
} from "../security/validators/calendar.validators.js";

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

export function createCalendarController(deps: { calendarService: CalendarService }) {
  const { calendarService } = deps;

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

        const created = await calendarService.createAvailability(workerId, body, req.user!);
        res.status(201).json({ data: availabilityToJson(created) });
      } catch (err) {
        next(err);
      }
    },

    updateAvailability: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { workerId, id } = availabilityPathParamsSchema.parse(req.params);
        assertWorkerPathAccess(req, workerId);
        const body = updateAvailabilitySchema.parse(req.body);

        const updated = await calendarService.updateAvailability(workerId, id, body, req.user!);
        res.status(200).json({ data: availabilityToJson(updated) });
      } catch (err) {
        next(err);
      }
    },

    deleteAvailability: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { workerId, id } = availabilityPathParamsSchema.parse(req.params);
        assertWorkerPathAccess(req, workerId);
        const query = deleteAvailabilitySchema.parse(req.query);

        await calendarService.deleteAvailability(workerId, id, query.version, req.user!);
        res.status(200).json({ data: { id, deleted: true } });
      } catch (err) {
        next(err);
      }
    },
  };
}
