import { Router } from "express";
import { authorise } from "../../../middleware/authorise.js";
import { Permission } from "@infra/shared-permissions";
import { readLimitMiddleware, writeLimitMiddleware } from "../../../platform/security/rateLimit.js";
import type { JobsService } from "../application/service.js";
import { createJobsController } from "./controller.js";
import type { IdempotencyRepository } from "../../../platform/persistence/idempotency.repository.js";

export type JobsRouterDeps = {
  jobsService: JobsService;
  idempotencyRepository: IdempotencyRepository;
};

export function createJobsRouter(deps: JobsRouterDeps): Router {
  const router = Router();
  const c = createJobsController(deps);

  router.get("/", authorise(Permission.JOB_READ), readLimitMiddleware, (req, res, next) => {
    void c.listJobs(req, res, next);
  });

  router.post("/", authorise(Permission.JOB_CREATE), writeLimitMiddleware, (req, res, next) => {
    void c.createJob(req, res, next);
  });

  router.get("/:id", authorise(Permission.JOB_READ), readLimitMiddleware, (req, res, next) => {
    void c.getJob(req, res, next);
  });

  router.patch("/:id", authorise(Permission.JOB_UPDATE), writeLimitMiddleware, (req, res, next) => {
    void c.updateJob(req, res, next);
  });

  router.post(
    "/:id/status",
    authorise(Permission.JOB_TRANSITION_STATUS),
    writeLimitMiddleware,
    (req, res, next) => {
      void c.transitionStatus(req, res, next);
    },
  );

  return router;
}
