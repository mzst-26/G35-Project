import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import { Permission } from "@infra/shared-permissions";
import { readLimiter } from "../security/rateLimit.js";

export const v1Router = Router();

v1Router.use(authenticate);
v1Router.use(readLimiter);

v1Router.get("/jobs", authorise(Permission.ADMIN_WRITE), (_req, res) => {
  res.status(200).json({ data: [] });
});
