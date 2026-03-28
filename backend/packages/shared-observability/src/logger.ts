// Conditional Pino logger factory.
//
// Behaviour table (LOG_LEVEL always overrides NODE_ENV default):
//   NODE_ENV=development → pino-pretty transport, level: debug
//   NODE_ENV=test        → silent (avoids test noise), level: silent
//   NODE_ENV=production  → JSON structured, level: info, PII fields redacted
//
// Usage:
//   const logger = createLogger('core-platform');
//   const reqLog = logger.child({ requestId, userId });
//   reqLog.info({ jobId }, 'job status changed');

import pino, { type Logger, type LoggerOptions } from "pino";
import { PII_REDACT_PATHS } from "./redactor.js";

// Exported for unit testing — callers should use createLogger instead.
export function buildLoggerOptions(service: string): LoggerOptions {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const explicitLevel = process.env.LOG_LEVEL;

  const base = { name: service };

  if (nodeEnv === "test") {
    return { ...base, level: explicitLevel ?? "silent" };
  }

  if (nodeEnv === "production") {
    return {
      ...base,
      level: explicitLevel ?? "info",
      redact: {
        paths: PII_REDACT_PATHS,
        censor: "[REDACTED]",
      },
    };
  }

  // development (and any other value)
  return {
    ...base,
    level: explicitLevel ?? "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
        singleLine: false,
      },
    },
  };
}

// Creates a Pino logger with the correct transport and level for the current
// NODE_ENV. Call once per service at boot and pass the instance around.
export function createLogger(service: string): Logger {
  return pino(buildLoggerOptions(service));
}

// Creates a request-scoped child logger with correlation fields pre-populated.
// All downstream log calls automatically include requestId and userId.
export function createRequestLogger(
  parent: Logger,
  requestId: string,
  userId?: string,
): Logger {
  return parent.child({
    requestId,
    ...(userId ? { userId } : {}),
  });
}
