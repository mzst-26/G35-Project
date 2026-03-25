import { createLogger } from "@infra/shared-observability";
import { env } from "../config/env.js";

process.env.NODE_ENV = env.NODE_ENV;
if (env.LOG_LEVEL) {
	process.env.LOG_LEVEL = env.LOG_LEVEL;
}

export const logger = createLogger("core-platform");
