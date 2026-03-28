import { Router } from "express";
import { authenticate } from "../../../middleware/authenticate.js";
import { authBurstLimitMiddleware } from "../../../platform/security/rateLimit.js";
import { createJobsRouter, type JobsRouterDeps } from "../../../modules/jobs/index.js";
import { createCalendarRouter, type CalendarRouterDeps } from "../../../modules/calendar/index.js";
import { createCompanyRouter, type CompanyRouterDeps } from "../../../modules/company/index.js";
import { createWorkerRouter, type WorkerRouterDeps } from "../../../modules/worker/index.js";
import { createAdminRouter, type AdminRouterDeps } from "../../../modules/admin/index.js";
import { createPenaltiesRouter } from "./penalties.js";

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
  v1Router.use("/penalties", createPenaltiesRouter());
  return v1Router;
}
