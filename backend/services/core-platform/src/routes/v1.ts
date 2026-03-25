import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authBurstLimitMiddleware } from "../security/rateLimit.js";
import { createJobsRouter } from "./jobs.js";
import { createCalendarRouter } from "./calendar.js";
import { createCompanyRouter } from "./company.js";
import { createWorkerRouter } from "./worker.js";
import { createAdminRouter } from "./admin.js";
import type { JobsRouterDeps } from "./jobs.js";
import type { CalendarRouterDeps } from "./calendar.js";
import type { CompanyRouterDeps } from "./company.js";
import type { WorkerRouterDeps } from "./worker.js";
import type { AdminRouterDeps } from "./admin.js";

export function createV1Router(deps: {
  jobs: JobsRouterDeps;
  calendar: CalendarRouterDeps;
  company: CompanyRouterDeps;
  worker: WorkerRouterDeps;
  admin: AdminRouterDeps;
}): Router {
  const v1Router = Router();
  v1Router.use(authBurstLimitMiddleware);
  v1Router.use(authenticate);
  v1Router.use("/jobs", createJobsRouter(deps.jobs));
  v1Router.use("/calendar", createCalendarRouter(deps.calendar));
  v1Router.use("/companies", createCompanyRouter(deps.company));
  v1Router.use("/workers", createWorkerRouter(deps.worker));
  v1Router.use("/admin", createAdminRouter(deps.admin));
  return v1Router;
}
