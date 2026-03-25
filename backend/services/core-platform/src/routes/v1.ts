import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authBurstLimitMiddleware } from "../security/rateLimit.js";
import { createJobsRouter } from "./jobs.js";
import { createCalendarRouter } from "./calendar.js";
import type { JobsRouterDeps } from "./jobs.js";
import type { CalendarRouterDeps } from "./calendar.js";

export function createV1Router(deps: { jobs: JobsRouterDeps; calendar: CalendarRouterDeps }): Router {
  const v1Router = Router();
  v1Router.use(authBurstLimitMiddleware);
  v1Router.use(authenticate);
  v1Router.use("/jobs", createJobsRouter(deps.jobs));
  v1Router.use("/calendar", createCalendarRouter(deps.calendar));
  return v1Router;
}
