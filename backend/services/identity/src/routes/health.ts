import { Router } from "express";
import { createServiceRoleClient } from "../supabase/index.js";

type HealthStatus = "ok" | "degraded";

type ApiHealth = {
  service: string;
  status: HealthStatus;
  timestamp: string;
  checks: {
    supabase: "ok" | "error";
  };
};

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const supabase = createServiceRoleClient();

  // Liveness check: a fast read against a known table. 42P01 (table missing)
  // is treated as ok — infra is up, just not migrated yet.
  const { error } = await supabase
    .from("auth_sessions")
    .select("session_id")
    .limit(1);

  const supabaseOk = !error || error.code === "42P01";

  const payload: ApiHealth = {
    service: "identity",
    status: supabaseOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      supabase: supabaseOk ? "ok" : "error",
    },
  };

  res.status(supabaseOk ? 200 : 503).json(payload);
});
