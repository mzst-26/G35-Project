export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  upstream?: string;
  method?: string;
  status?: number;
  latencyMs?: number;
  ip?: string;
  error?: unknown;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  userId?: string;
  context?: Omit<LogContext, 'requestId' | 'userId'>;
}

// Redact sensitive headers and fields
const SENSITIVE_FIELDS = ['authorization', 'cookie', 'x-csrf-token', 'password', 'token', 'secret'];

export function redactSensitive(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const redacted = { ...obj } as Record<string, unknown>;
  for (const key in redacted) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  return redacted;
}

export class Logger {
  private context: LogContext = {};

  setContext(ctx: Partial<LogContext>): void {
    this.context = { ...this.context, ...ctx };
  }

  private formatEntry(level: 'debug' | 'info' | 'warn' | 'error', message: string, extra?: unknown): LogEntry {
    const extraObj = (extra && typeof extra === 'object') ? (extra as Record<string, unknown>) : {};
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.context.requestId,
      userId: this.context.userId,
      context: {
        ...this.context,
        requestId: undefined,
        userId: undefined,
        ...extraObj,
      },
    };
  }

  debug(message: string, extra?: unknown): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const entry = this.formatEntry('debug', message, extra);
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, extra?: unknown): void {
    const entry = this.formatEntry('info', message, extra);
    console.log(JSON.stringify(entry));
  }

  warn(message: string, extra?: unknown): void {
    const entry = this.formatEntry('warn', message, extra);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, error?: unknown, extra?: unknown): void {
    const redactedError = error ? redactSensitive(error) : undefined;
    const extraObj = (extra && typeof extra === 'object') ? (extra as Record<string, unknown>) : {};
    const entry = this.formatEntry('error', message, { error: redactedError, ...extraObj });
    console.error(JSON.stringify(entry));
  }
}

export const logger = new Logger();
