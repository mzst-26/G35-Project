// Sentry integration wrapper.
//
// Safe no-op when SENTRY_DSN is absent or @sentry/node is unavailable.
// All Sentry captures are tagged with service, environment, and release.
// Caller must PII-redact data before passing to capture functions.

import type { Express } from "express";
import type { Scope } from "@sentry/node";

// Lazily resolved Sentry module — only loaded when DSN is configured.
// Using a let + dynamic import avoids hard dependency at module load time.
let _sentry: typeof import("@sentry/node") | null = null;
let _initialised = false;

async function getSentry(): Promise<typeof import("@sentry/node") | null> {
  if (_sentry !== null) return _sentry as typeof import("@sentry/node");
  if (_initialised) return null;
  _initialised = true;
  try {
    _sentry = await import("@sentry/node");
    return _sentry as typeof import("@sentry/node");
  } catch {
    return null;
  }
}

// Call once at service boot in index.ts before createApp().
// No-op when SENTRY_DSN is absent.
export async function initialiseSentry(service: string): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await getSentry();
  if (!Sentry) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    release: process.env.SENTRY_RELEASE ?? process.env.GIT_SHA,
    sendDefaultPii: false,
    initialScope: { tags: { service } },
    ignoreErrors: ["TOKEN_EXPIRED", "TOKEN_MISSING"],
  });
}

// Attaches Sentry's Express error handler to the app.
// Must be called after all routes, before the global error handler.
export async function setupSentryExpressHandler(app: Express): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await getSentry();
  if (!Sentry) return;
  Sentry.setupExpressErrorHandler(app);
}

export interface SentryCaptureOptions {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: "debug" | "info" | "warning" | "error" | "fatal";
}

// Captures a business/domain event to Sentry as a message.
// Caller must strip PII before passing to this function.
export async function captureSentryEvent(
  message: string,
  options: SentryCaptureOptions = {},
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await getSentry();
  if (!Sentry) return;

  Sentry.withScope((scope: Scope) => {
    if (options.tags) {
      for (const [key, value] of Object.entries(options.tags)) {
        scope.setTag(key, value);
      }
    }
    if (options.extra) {
      scope.setContext("extra", options.extra);
    }
    Sentry.captureMessage(message, options.level ?? "warning");
  });
}

// Captures an unhandled exception to Sentry.
export async function captureSentryException(
  error: unknown,
  options: SentryCaptureOptions = {},
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await getSentry();
  if (!Sentry) return;

  Sentry.withScope((scope: Scope) => {
    if (options.tags) {
      for (const [key, value] of Object.entries(options.tags)) {
        scope.setTag(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
