import { Router } from "express";
import { Permission } from "@infra/shared-permissions";
import { authorise } from "../../../middleware/authorise.js";
import { readLimitMiddleware, writeLimitMiddleware } from "../../../platform/security/rateLimit.js";
import { createWorkerController } from "./controller.js";
import type { WorkerService } from "../application/service.js";

export type WorkerRouterDeps = {
  workerService: WorkerService;
};

export function createWorkerRouter(deps: WorkerRouterDeps): Router {
  const router = Router();
  const c = createWorkerController(deps);

  router.get("/:workerId", authorise(Permission.WORKER_READ), readLimitMiddleware, (req, res, next) => {
    void c.getWorker(req, res, next);
  });

  router.patch("/:workerId", authorise(Permission.WORKER_WRITE), writeLimitMiddleware, (req, res, next) => {
    void c.updateWorker(req, res, next);
  });

  return router;
}
