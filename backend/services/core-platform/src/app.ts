import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import { setupSentryExpressHandler } from "@infra/shared-observability";
import { NotFoundError } from "@infra/shared-errors";
import { supabase } from "./config/supabase.js";
import { getEnv } from "./config/env.js";
import { CalendarService } from "./modules/calendar/application/service.js";
import { JobsService } from "./modules/jobs/application/service.js";
import { CompanyService } from "./modules/company/application/service.js";
import { WorkerService } from "./modules/worker/application/service.js";
import { AdminService } from "./modules/admin/application/service.js";
import { createDocsRouter } from "./docs/router.js";
import { createHealthRouter } from "./bootstrap/http/routes/health.js";
import { createV1Router } from "./bootstrap/http/routes/v1.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { logger } from "./observability/logger.js";
import { ensureRateLimitersInitialized } from "./platform/security/rateLimit.js";
import { IdempotencyRepository } from "./platform/persistence/idempotency.repository.js";
import { SupabaseCalendarRepository, type CalendarRepository } from "./modules/calendar/infrastructure/repository.js";
import { SupabaseJobsRepository, type JobsRepository } from "./modules/jobs/infrastructure/repository.js";
import { SupabaseCompanyRepository, type CompanyRepository } from "./modules/company/infrastructure/repository.js";
import { SupabaseWorkerRepository, type WorkerRepository } from "./modules/worker/infrastructure/repository.js";
import { SupabaseAdminRepository, type AdminRepository } from "./modules/admin/infrastructure/repository.js";
import type { JobsRouterDeps } from "./modules/jobs/index.js";
import type { CalendarRouterDeps } from "./modules/calendar/index.js";
import type { CompanyRouterDeps } from "./modules/company/index.js";
import type { WorkerRouterDeps } from "./modules/worker/index.js";
import type { AdminRouterDeps } from "./modules/admin/index.js";
import { startOutboxRelayWorker } from "./workers/outbox.relay.worker.js";
import { startIdempotencyCleanupWorker } from "./workers/idempotency.cleanup.worker.js";

export interface CreateAppOptions {
  jobsRepository?: JobsRepository;
  idempotencyRepository?: IdempotencyRepository;
  jobsService?: JobsService;
  calendarRepository?: CalendarRepository;
  calendarService?: CalendarService;
  companyRepository?: CompanyRepository;
  companyService?: CompanyService;
  workerRepository?: WorkerRepository;
  workerService?: WorkerService;
  adminRepository?: AdminRepository;
  adminService?: AdminService;
  startWorkers?: boolean;
  workerIntervalMs?: {
    outboxRelay?: number;
    idempotencyCleanup?: number;
  };
}

export interface AppWithWorkers {
  app: any;
  stopWorkers?: () => void;
}

function buildJobsDeps(options?: CreateAppOptions): JobsRouterDeps {
  const jobsRepository = options?.jobsRepository ?? new SupabaseJobsRepository(supabase);
  const jobsService = options?.jobsService ?? new JobsService(jobsRepository);
  const idempotencyRepository = options?.idempotencyRepository ?? new IdempotencyRepository(supabase);
  return { jobsService, idempotencyRepository };
}

function buildCalendarDeps(options?: CreateAppOptions): CalendarRouterDeps {
  const calendarRepository = options?.calendarRepository ?? new SupabaseCalendarRepository(supabase);
  const calendarService =
    options?.calendarService ?? new CalendarService(calendarRepository, getEnv().CHANGE_FEE_WINDOW_HOURS);
  const idempotencyRepository = options?.idempotencyRepository ?? new IdempotencyRepository(supabase);
  return { calendarService, idempotencyRepository };
}

function buildCompanyDeps(options?: CreateAppOptions): CompanyRouterDeps {
  const companyRepository = options?.companyRepository ?? new SupabaseCompanyRepository(supabase);
  const companyService = options?.companyService ?? new CompanyService(companyRepository);
  return { companyService };
}

function buildWorkerDeps(options?: CreateAppOptions): WorkerRouterDeps {
  const workerRepository = options?.workerRepository ?? new SupabaseWorkerRepository(supabase);
  const workerService = options?.workerService ?? new WorkerService(workerRepository);
  return { workerService };
}

function buildAdminDeps(options?: CreateAppOptions): AdminRouterDeps {
  const companyRepository = options?.companyRepository ?? new SupabaseCompanyRepository(supabase);
  const workerRepository = options?.workerRepository ?? new SupabaseWorkerRepository(supabase);
  const adminRepository = options?.adminRepository ?? new SupabaseAdminRepository(supabase);
  const companyService = options?.companyService ?? new CompanyService(companyRepository);
  const workerService = options?.workerService ?? new WorkerService(workerRepository);
  const adminService =
    options?.adminService ??
    new AdminService(companyRepository, workerRepository, adminRepository, companyService, workerService);
  return { adminService };
}

export async function createApp(options?: CreateAppOptions) {
  const env = getEnv();
  ensureRateLimitersInitialized();
  const app = express();

  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(
    cors((req, callback) => {
      callback(null, {
        origin: (origin, cb2) => {
          if (!origin) return cb2(null, true);
          if (env.CORS_ORIGINS.includes(origin)) return cb2(null, true);
          logger.warn({ origin, requestId: req.requestId }, "cors_origin_denied");
          cb2(null, false);
        },
        credentials: true,
      });
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(requestLoggerMiddleware);

  app.use(createHealthRouter());
  app.use(createDocsRouter());

  const adminDeps = buildAdminDeps(options);
  app.use("/api/v1", createV1Router({
    jobs: buildJobsDeps(options),
    calendar: buildCalendarDeps(options),
    company: buildCompanyDeps(options),
    worker: buildWorkerDeps(options),
    admin: adminDeps,
  }));

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError("Route not found."));
  });

  await setupSentryExpressHandler(app);
  app.use(globalErrorHandler);

  let stopWorkers: (() => void) | undefined;
  if (options?.startWorkers && adminDeps.adminService) {
    const stops: Array<() => void> = [];
    stops.push(startOutboxRelayWorker(adminDeps.adminService, options?.workerIntervalMs?.outboxRelay));
    stops.push(startIdempotencyCleanupWorker(adminDeps.adminService, options?.workerIntervalMs?.idempotencyCleanup));
    stopWorkers = () => stops.forEach((stop) => stop());
    logger.info("background_workers_started");
  }

  return { app, stopWorkers };
}
