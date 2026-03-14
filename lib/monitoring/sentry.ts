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
  context: { flow: string; endpoint?: string; action?: string; role?: string },
): void {
  if (typeof window === "undefined") return;
  window.Sentry?.captureMessage?.(message, {
    tags: {
      flow: context.flow,
      endpoint: context.endpoint ?? "unknown",
      action: context.action ?? "unknown",
      role: context.role ?? "unknown",
    },
  });
}
