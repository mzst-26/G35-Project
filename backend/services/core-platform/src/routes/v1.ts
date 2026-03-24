import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import { Permission } from "@infra/shared-permissions";
import { readLimitMiddleware, writeLimitMiddleware } from "../security/rateLimit.js";

export function createV1Router(): Router {
  const v1Router = Router();

  v1Router.use(authenticate);

  v1Router.get("/jobs", readLimitMiddleware, authorise(Permission.JOB_READ), (_req, res) => {
    res.status(200).json({ data: [] });
  });

  v1Router.post("/jobs", writeLimitMiddleware, authorise(Permission.JOB_CREATE), (_req, res) => {
    res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "Job creation is not available yet." } });
  });

  return v1Router;
}
