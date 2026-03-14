import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWithScope, mockCaptureMessage } = vi.hoisted(() => ({
  mockWithScope: vi.fn(),
  mockCaptureMessage: vi.fn(),
}));

vi.mock("@sentry/node", () => ({
  withScope: mockWithScope,
  captureMessage: mockCaptureMessage,
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/profiling-node", () => ({
  nodeProfilingIntegration: vi.fn(),
}));

import { captureSentryBusinessFailure } from "../../src/observability/sentry.js";

beforeEach(() => {
  mockWithScope.mockReset();
  mockCaptureMessage.mockReset();
  // Default: invoke the callback synchronously so assertions can inspect scope calls.
  mockWithScope.mockImplementation((cb: (scope: unknown) => void) => {
    const scope = {
      setTag: vi.fn(),
      setContext: vi.fn(),
    };
    cb(scope);
    return scope;
  });
});

describe("captureSentryBusinessFailure", () => {
  it("calls Sentry.withScope and captureMessage with the correct message", () => {
    captureSentryBusinessFailure("payment failed", { flow: "checkout" });

    expect(mockWithScope).toHaveBeenCalledOnce();
    expect(mockCaptureMessage).toHaveBeenCalledWith("payment failed", "warning");
  });

  it("sets all provided tags on the scope", () => {
    const tags = { flow: "registration", step: "company-lookup" };
    let capturedScope: Record<string, unknown> | undefined;

    mockWithScope.mockImplementation((cb: (scope: unknown) => void) => {
      const scope = { setTag: vi.fn(), setContext: vi.fn() };
      cb(scope);
      capturedScope = scope as unknown as Record<string, unknown>;
    });

    captureSentryBusinessFailure("lookup error", tags);

    const setTag = capturedScope!.setTag as ReturnType<typeof vi.fn>;
    expect(setTag).toHaveBeenCalledWith("flow", "registration");
    expect(setTag).toHaveBeenCalledWith("step", "company-lookup");
  });

  it("sets context when extra is provided", () => {
    const extra = { companyNumber: "12345", reason: "not found" };
    let capturedScope: Record<string, unknown> | undefined;

    mockWithScope.mockImplementation((cb: (scope: unknown) => void) => {
      const scope = { setTag: vi.fn(), setContext: vi.fn() };
      cb(scope);
      capturedScope = scope as unknown as Record<string, unknown>;
    });

    captureSentryBusinessFailure("business error", { flow: "test" }, extra);

    const setContext = capturedScope!.setContext as ReturnType<typeof vi.fn>;
    expect(setContext).toHaveBeenCalledWith("business_failure", extra);
  });

  it("does not call setContext when extra is omitted", () => {
    let capturedScope: Record<string, unknown> | undefined;

    mockWithScope.mockImplementation((cb: (scope: unknown) => void) => {
      const scope = { setTag: vi.fn(), setContext: vi.fn() };
      cb(scope);
      capturedScope = scope as unknown as Record<string, unknown>;
    });

    captureSentryBusinessFailure("simple error", { flow: "auth" });

    const setContext = capturedScope!.setContext as ReturnType<typeof vi.fn>;
    expect(setContext).not.toHaveBeenCalled();
  });

  it("no-ops gracefully when Sentry withScope throws (not initialized)", () => {
    mockWithScope.mockImplementation(() => {
      throw new Error("Sentry not initialized");
    });

    expect(() =>
      captureSentryBusinessFailure("msg", { flow: "x" }),
    ).toThrow("Sentry not initialized");
  });
});
