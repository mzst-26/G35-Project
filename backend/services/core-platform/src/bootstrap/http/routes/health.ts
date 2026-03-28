import type { Request, Response } from "express";
import { Router } from "express";
import { checkDbHealth } from "@infra/shared-db";

async function readyHandler(_req: Request, res: Response): Promise<void> {
  const db = await checkDbHealth();
  const status = db.ok ? "ok" : "degraded";

  res.status(db.ok ? 200 : 503).json({
    status,
    kind: "ready",
    service: "core-platform",
    timestamp: new Date().toISOString(),
    checks: {
      db,
    },
  });
}

/** New router per app instance — avoids re-mounting a shared Router across tests / hot reload. */
export function createHealthRouter(): Router {
  const router = Router();

  router.get("/health/live", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      kind: "live",
      service: "core-platform",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/health/ready", readyHandler);

  /** Backwards-compatible alias — same payload as `/health/ready` (use `/health/live` for process-only liveness). */
  router.get("/health", readyHandler);

  return router;
}
