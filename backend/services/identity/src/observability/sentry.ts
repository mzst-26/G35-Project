// Sentry integration for the identity service.
//
// Exports: initialiseSentry, setupSentryExpressHandler, addSentryBreadcrumb,
//          captureSentrySecurityEvent, sentryErrorHandler.
//
// Set SENTRY_DSN in production. All functions are no-ops when DSN is absent.
// Release is tied to GIT_SHA/SENTRY_RELEASE when available.
// Alert thresholds are configured in the Sentry project, not in application code.

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Express, NextFunction, Request, Response } from "express";
import type { SecurityEvent } from "../types/index.js";

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

// Call once at startup in index.ts before createApp().
// Safe no-op when SENTRY_DSN is absent (local dev / CI).
export function initialiseSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return; // no-op in local dev / CI without DSN
  }

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
  const profileSessionSampleRate = Number(process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE ?? "0");
  const sendDefaultPii = parseBooleanEnv(process.env.SENTRY_SEND_DEFAULT_PII, false);

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate,
    profileSessionSampleRate,
    profileLifecycle: "trace",
    sendDefaultPii,
    // Injected at build time via CI (e.g. GIT_SHA env var from the pipeline).
    release: process.env.SENTRY_RELEASE ?? process.env.GIT_SHA,
    // Suppress noise from expected client errors that do not indicate a bug.
    ignoreErrors: [
      "TokenExpiredError",
      "TOKEN_EXPIRED",
      "TOKEN_MISSING",
    ],
  });
}

// Wires Sentry's own Express error handler onto the app.
// Must be called after all routes but before the app-level error handler.
// This attaches full request context (URL, user, trace ID) to every captured event.
export function setupSentryExpressHandler(app: Express): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setupExpressErrorHandler(app);
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level: "debug" | "info" | "warning" | "error" | "fatal";
  data?: Record<string, unknown>;
}

// Adds a breadcrumb to the active transaction for pre-error context.
export function addSentryBreadcrumb(breadcrumb: SentryBreadcrumb): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level,
    data: breadcrumb.data,
  });
}

// ---------------------------------------------------------------------------
// Security event capture
// ---------------------------------------------------------------------------

// Forwards a high-severity security event to Sentry as an explicit message.
// Caller must PII-redact the event before passing it (events.ts does this).
export function captureSentrySecurityEvent(event: SecurityEvent): void {
  Sentry.withScope((scope) => {
    scope.setTag("security_event", event.event);
    scope.setTag("flow", event.flow ?? "auth");
    scope.setTag("endpoint", event.endpoint ?? "unknown");
    if (event.role) {
      scope.setTag("role", event.role);
    }
    if (event.decision) {
      scope.setTag("decision", event.decision);
    }
    if (event.accountStatus) {
      scope.setTag("account_status", event.accountStatus);
    }
    scope.setContext("security_event_detail", {
      eventId: event.eventId,
      requestId: event.requestId,
      occurredAt: event.occurredAt,
      role: event.role,
    });
    Sentry.captureMessage(`Security event: ${event.event}`, "warning");
  });
}

export function captureSentryBusinessFailure(
  message: string,
  tags: Record<string, string>,
  extra?: Record<string, unknown>,
): void {
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(tags)) {
      scope.setTag(key, value);
    }
    if (extra) {
      scope.setContext("business_failure", extra);
    }
    Sentry.captureMessage(message, "warning");
  });
}

// ---------------------------------------------------------------------------
// Express error handler
// ---------------------------------------------------------------------------

// Fallback error handler — captures any exception that slipped past route-level
// try/catch. setupSentryExpressHandler attaches request context; this handles
// the actual Sentry capture for errors we explicitly forward via next(err).
export function sentryErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  Sentry.captureException(err, {
    tags: {
      path: req.path,
      method: req.method,
    },
    extra: {
      requestId: req.headers["x-request-id"],
    },
  });
  next(err);
}
