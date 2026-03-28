import { Router } from "express";
import { Permission } from "@infra/shared-permissions";
import { authorise } from "../../../middleware/authorise.js";
import { readLimitMiddleware, writeLimitMiddleware } from "../../../platform/security/rateLimit.js";
import type { CalendarService } from "../application/service.js";
import type { IdempotencyRepository } from "../../../platform/persistence/idempotency.repository.js";
import { createCalendarController } from "./controller.js";

export type CalendarRouterDeps = {
  calendarService: CalendarService;
  idempotencyRepository: IdempotencyRepository;
};

export function createCalendarRouter(deps: CalendarRouterDeps): Router {
  const router = Router();
  const c = createCalendarController(deps);

  router.get("/:workerId", authorise(Permission.CALENDAR_READ), readLimitMiddleware, (req, res, next) => {
    void c.listAvailability(req, res, next);
  });

  router.post(
    "/:workerId/availability",
    authorise(Permission.CALENDAR_WRITE),
    writeLimitMiddleware,
    (req, res, next) => {
      void c.createAvailability(req, res, next);
    },
  );

  router.patch(
    "/:workerId/availability/:id",
    authorise(Permission.CALENDAR_WRITE),
    writeLimitMiddleware,
    (req, res, next) => {
      void c.updateAvailability(req, res, next);
    },
  );

  router.delete(
    "/:workerId/availability/:id",
    authorise(Permission.CALENDAR_WRITE),
    writeLimitMiddleware,
    (req, res, next) => {
      void c.deleteAvailability(req, res, next);
    },
  );

  return router;
}
