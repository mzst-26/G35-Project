import { initialiseSentry as bootstrapSentry } from "@infra/shared-observability";
import { getEnv } from "../config/env.js";

export async function initialiseSentry(): Promise<void> {
  const env = getEnv();
  if (env.GIT_SHA) {
    process.env.GIT_SHA = env.GIT_SHA;
  }
  process.env.SENTRY_ENVIRONMENT = env.NODE_ENV;
  await bootstrapSentry("core-platform");
}
