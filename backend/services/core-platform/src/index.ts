import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { logger } from "./observability/logger.js";
import { initialiseSentry } from "./observability/sentry.js";

async function bootstrap(): Promise<void> {
  const env = getEnv();

  await initialiseSentry();

  void logger;

  const { app, stopWorkers } = await createApp({ startWorkers: !env.SKIP_BACKGROUND_WORKERS });

  const server = app.listen(env.PORT, () => {
    logger.info(`core-platform listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "shutdown_signal_received");
    if (stopWorkers) {
      stopWorkers();
    }
    server.close((err) => {
      if (err) {
        logger.error({ err }, "http_server_close_error");
        process.exit(1);
        return;
      }
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("shutdown_timeout_forcing_exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

void bootstrap();
