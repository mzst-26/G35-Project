import type { AuthenticatedUser } from "@infra/shared-auth";
import { UserRole } from "@infra/shared-permissions";
import type { AdminService } from "../modules/admin/application/service.js";
import { logger } from "../observability/logger.js";

const SYSTEM_ADMIN_USER: AuthenticatedUser = {
  userId: "00000000-0000-0000-0000-000000000000",
  email: "system@core-platform.local",
  role: UserRole.ADMIN,
};

export function startIdempotencyCleanupWorker(
  adminService: AdminService,
  intervalMs: number = 6 * 60 * 60 * 1000, // Default 6 hours
): () => void {
  const timer = setInterval(async () => {
    try {
      const result = await adminService.cleanupExpiredIdempotency(10_000, SYSTEM_ADMIN_USER);
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
