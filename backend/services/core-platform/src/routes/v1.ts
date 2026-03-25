import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authBurstLimitMiddleware } from "../security/rateLimit.js";
import { createJobsRouter } from "./jobs.js";
import type { JobsRouterDeps } from "./jobs.js";

export function createV1Router(deps: JobsRouterDeps): Router {
  const v1Router = Router();
  v1Router.use(authBurstLimitMiddleware);
  v1Router.use(authenticate);
  v1Router.use("/jobs", createJobsRouter(deps));
  return v1Router;
}
