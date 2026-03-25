import type { AdminService } from "../domain/admin/admin.service.js";
import { logger } from "../observability/logger.js";

const SYSTEM_ADMIN_USER = {
  userId: "00000000-0000-0000-0000-000000000000",
  email: "system@core-platform.local",
  role: "admin",
  adminLevel: "super",
} as const;

export function startIdempotencyCleanupWorker(
  adminService: AdminService,
  intervalMs: number = 6 * 60 * 60 * 1000, // Default 6 hours
): () => void {
  const timer = setInterval(async () => {
    try {
      const result = await adminService.cleanupExpiredIdempotency(10_000, SYSTEM_ADMIN_USER as any);
      logger.info({ result }, "idempotency_cleanup_executed");
    } catch (err) {
      logger.error({ err }, "idempotency_cleanup_failed");
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    logger.info("idempotency_cleanup_worker_stopped");
  };
}
