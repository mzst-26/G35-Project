import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({
    service: "communications",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});
