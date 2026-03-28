// Winston structured logger for the identity service.
//
// JSON format in all environments so logs are machine-parseable.
// PII removal is the caller's responsibility (see observability/events.ts).
// Level is controlled by LOG_LEVEL env var; default "info" in prod, "debug" in dev.
// Console-only transport here; production pipelines consume the JSON stdout stream.
// Set LOG_FILE=./logs/identity.log to also write to a local file (dev only).

import winston from "winston";

// ---------------------------------------------------------------------------
// Log format
// ---------------------------------------------------------------------------

// Pipeline: timestamp → errors with stack → compact JSON.
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------

const transports: winston.transport[] = [
  new winston.transports.Console({
    // Suppress all output during test runs; set TEST_LOG=true to re-enable.
    silent: process.env.NODE_ENV === "test" && process.env.TEST_LOG !== "true",
  }),
];

// Optional file transport for local debugging (never in production).
// Usage: LOG_FILE=./logs/identity.log npm run dev
if (process.env.NODE_ENV !== "production" && process.env.LOG_FILE) {
  transports.push(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      maxsize: 10 * 1024 * 1024, // 10 MB rotation
      maxFiles: 3,
      tailable: true,
    }),
  );
}

// ---------------------------------------------------------------------------
// Logger instance
// ---------------------------------------------------------------------------

// Singleton — all modules import this rather than creating their own loggers.
export const authLogger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: jsonFormat,
  defaultMeta: { service: "identity" },
  transports,
});

// ---------------------------------------------------------------------------
// Request-scoped child logger factory
// ---------------------------------------------------------------------------

/**
 * Creates a child logger pre-populated with request context fields.
 * Use this in middleware and route handlers so all downstream logs
 * automatically include the request ID without manual repetition.
 *
 * @param requestId - Value from the `x-request-id` header or generated UUID.
 * @param userId    - Supabase user ID if the request is authenticated.
 *
 * @example
 *   const log = createRequestLogger(req.headers["x-request-id"], req.user?.id);
 *   log.info("otp requested");
 */
export function createRequestLogger(
  requestId: string,
  userId?: string,
): winston.Logger {
  return authLogger.child({
    requestId,
    ...(userId ? { userId } : {}),
  });
}




