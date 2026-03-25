import { Router } from "express";
import { Permission } from "@infra/shared-permissions";
import { authorise } from "../middleware/authorise.js";
import { adminLimitMiddleware } from "../security/rateLimit.js";
import { createAdminController } from "../controllers/admin.controller.js";
import type { AdminService } from "../domain/admin/admin.service.js";

export type AdminRouterDeps = {
  adminService: AdminService;
};

export function createAdminRouter(deps: AdminRouterDeps): Router {
  const router = Router();
  const c = createAdminController(deps);

  router.get("/companies", authorise(Permission.ADMIN_READ), adminLimitMiddleware, (req, res, next) => {
    void c.listCompanies(req, res, next);
  });

  router.patch(
    "/companies/:companyId/status",
    authorise(Permission.ADMIN_WRITE),
    adminLimitMiddleware,
    (req, res, next) => {
      void c.updateCompanyStatus(req, res, next);
    },
  );

  router.get("/workers", authorise(Permission.ADMIN_READ), adminLimitMiddleware, (req, res, next) => {
    void c.listWorkers(req, res, next);
  });

  router.patch(
    "/workers/:workerId/verification",
    authorise(Permission.ADMIN_WRITE),
    adminLimitMiddleware,
    (req, res, next) => {
      void c.updateWorkerVerification(req, res, next);
    },
  );

  router.post("/outbox/relay", authorise(Permission.ADMIN_WRITE), adminLimitMiddleware, (req, res, next) => {
    void c.relayOutbox(req, res, next);
  });

  router.post(
    "/idempotency/cleanup",
    authorise(Permission.ADMIN_WRITE),
    adminLimitMiddleware,
    (req, res, next) => {
      void c.cleanupIdempotency(req, res, next);
    },
  );

  return router;
}
