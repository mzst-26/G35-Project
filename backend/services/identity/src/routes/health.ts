import { Router } from "express";
import { ApiHealth } from "@infra/shared-types";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const payload: ApiHealth = {
    service: "identity",
    status: "ok",
    timestamp: new Date().toISOString()
  };

  res.status(200).json(payload);
});
