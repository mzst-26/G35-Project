import { afterEach, describe, expect, it } from "vitest";
import { createLogger } from "../src/logger.js";

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

describe("createLogger smoke tests", () => {
  it("creates logger in development mode", () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_LEVEL;
    const logger = createLogger("svc-dev");
    expect(logger).toBeDefined();
  });

  it("creates logger in test mode", () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    const logger = createLogger("svc-test");
    expect(logger).toBeDefined();
  });

  it("creates logger in production mode", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const logger = createLogger("svc-prod");
    expect(logger).toBeDefined();
  });
});
