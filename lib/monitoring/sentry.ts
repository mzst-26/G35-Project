type FrontendSentry = {
  captureException?: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage?: (message: string, context?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    Sentry?: FrontendSentry;
  }
}

export function captureFrontendError(
  error: unknown,
  context: { flow: string; endpoint?: string; action?: string; role?: string },
): void {
  if (typeof window === "undefined") return;
  window.Sentry?.captureException?.(error, {
    tags: {
      flow: context.flow,
      endpoint: context.endpoint ?? "unknown",
      action: context.action ?? "unknown",
      role: context.role ?? "unknown",
    },
  });
}

export function captureFrontendMessage(
  message: string,
  context: {
    flow: string;
    endpoint?: string;
    action?: string;
    role?: string;
    /** Optional extra data for Sentry context (e.g. status, code). */
    extra?: Record<string, unknown>;
  },
): void {
  if (typeof window === "undefined") return;
  const payload: Record<string, unknown> = {
    tags: {
      flow: context.flow,
      endpoint: context.endpoint ?? "unknown",
      action: context.action ?? "unknown",
      role: context.role ?? "unknown",
    },
  };
  if (context.extra && Object.keys(context.extra).length > 0) {
    payload.extra = context.extra;
  }
  window.Sentry?.captureMessage?.(message, payload);
}
