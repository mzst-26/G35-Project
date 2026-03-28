import type { AdminService } from "../domain/admin/admin.service.js";
import { logger } from "../observability/logger.js";

const SYSTEM_ADMIN_USER = {
  userId: "00000000-0000-0000-0000-000000000000",
  email: "system@core-platform.local",
  role: "admin",
  adminLevel: "super",
} as const;

export function startOutboxRelayWorker(adminService: AdminService, intervalMs: number = 60_000): () => void {
  const timer = setInterval(async () => {
    try {
      const result = await adminService.relayOutbox(100, SYSTEM_ADMIN_USER as any);
      logger.info({ result }, "outbox_relay_executed");
    } catch (err) {
      logger.error({ err }, "outbox_relay_failed");
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    logger.info("outbox_relay_worker_stopped");
  };
}
