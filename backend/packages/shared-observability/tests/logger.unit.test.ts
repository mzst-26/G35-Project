import { describe, it, expect, afterEach } from "vitest";
import { buildLoggerOptions } from "../src/logger.js";
import { PII_REDACT_PATHS } from "../src/redactor.js";

// Save originals to restore after each test
const originalNodeEnv = process.env.NODE_ENV;
const originalLogLevel = process.env.LOG_LEVEL;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalLogLevel === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = originalLogLevel;
  }
});

describe("buildLoggerOptions — NODE_ENV=test", () => {
  it("defaults to silent level", () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts.level).toBe("silent");
  });

  it("respects LOG_LEVEL override in test env", () => {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "error";
    const opts = buildLoggerOptions("svc");
    expect(opts.level).toBe("error");
  });

  it("does not set a transport in test env", () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts).not.toHaveProperty("transport");
  });

  it("does not set redact paths in test env", () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts).not.toHaveProperty("redact");
  });
});

describe("buildLoggerOptions — NODE_ENV=production", () => {
  it("defaults to info level", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts.level).toBe("info");
  });

  it("respects LOG_LEVEL override in production", () => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "warn";
    const opts = buildLoggerOptions("svc");
    expect(opts.level).toBe("warn");
  });

  it("sets pino redact paths for PII fields", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts.redact).toBeDefined();
    const redact = opts.redact as { paths: string[]; censor: string };
    expect(redact.censor).toBe("[REDACTED]");
    expect(redact.paths).toContain("email");
    expect(redact.paths).toContain("phone");
    expect(redact.paths).toContain("name");
    expect(redact.paths.length).toBe(PII_REDACT_PATHS.length);
  });

  it("does not use pino-pretty transport in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts).not.toHaveProperty("transport");
  });
});

describe("buildLoggerOptions — NODE_ENV=development", () => {
  it("defaults to debug level", () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts.level).toBe("debug");
  });

  it("respects LOG_LEVEL override in development", () => {
    process.env.NODE_ENV = "development";
    process.env.LOG_LEVEL = "info";
    const opts = buildLoggerOptions("svc");
    expect(opts.level).toBe("info");
  });

  it("uses pino-pretty transport in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts.transport).toBeDefined();
    const transport = opts.transport as { target: string };
    expect(transport.target).toBe("pino-pretty");
  });

  it("does not set redact paths in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_LEVEL;
    const opts = buildLoggerOptions("svc");
    expect(opts).not.toHaveProperty("redact");
  });
});

describe("buildLoggerOptions — service name", () => {
  it("includes the service name in options", () => {
    process.env.NODE_ENV = "test";
    const opts = buildLoggerOptions("core-platform");
    expect(opts.name).toBe("core-platform");
  });
});
