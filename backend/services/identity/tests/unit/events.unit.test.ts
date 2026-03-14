import { describe, expect, it, vi } from "vitest";
import { emitSecurityEvent } from "../../src/observability/events.js";

const mocks = vi.hoisted(() => ({
  infoMock: vi.fn(),
  warnMock: vi.fn(),
  breadcrumbMock: vi.fn(),
  sentrySecurityMock: vi.fn(),
  insertMock: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("../../src/observability/logger.js", () => ({
  authLogger: {
    info: mocks.infoMock,
    warn: mocks.warnMock,
  },
}));

vi.mock("../../src/observability/sentry.js", () => ({
  addSentryBreadcrumb: mocks.breadcrumbMock,
  captureSentrySecurityEvent: mocks.sentrySecurityMock,
}));

vi.mock("../../src/supabase/index.js", () => ({
  createServiceRoleClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: mocks.insertMock,
    }),
  }),
}));

describe("emitSecurityEvent", () => {
  it("redacts IPv4 to /24 in audit metadata", async () => {
    emitSecurityEvent({
      eventId: "evt-1",
      requestId: "req-1",
      occurredAt: new Date().toISOString(),
      event: "auth.security.csrf_violation",
      detail: "bad csrf",
      ipAddress: "203.0.113.42",
    });

    await Promise.resolve();

    expect(mocks.infoMock).toHaveBeenCalledWith(
      expect.stringContaining("security_event"),
      expect.objectContaining({
        securityEvent: expect.objectContaining({ ipAddress: "203.0.113.x" }),
      }),
    );

    expect(mocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_subnet: "203.0.113.x",
      }),
    );
  });

  it("redacts IPv6 to /48 in audit metadata", async () => {
    emitSecurityEvent({
      eventId: "evt-2",
      requestId: "req-2",
      occurredAt: new Date().toISOString(),
      event: "auth.security.anomalous_session",
      detail: "anomaly",
      ipAddress: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    });

    await Promise.resolve();

    expect(mocks.infoMock).toHaveBeenCalledWith(
      expect.stringContaining("security_event"),
      expect.objectContaining({
        securityEvent: expect.objectContaining({ ipAddress: "2001:0db8:85a3:xxxx:xxxx:xxxx:xxxx:xxxx" }),
      }),
    );
  });

  it("falls back to safe IPv6 mask for malformed values", async () => {
    emitSecurityEvent({
      eventId: "evt-3",
      requestId: "req-3",
      occurredAt: new Date().toISOString(),
      event: "auth.security.brute_force_detected",
      detail: "too many attempts",
      ipAddress: ":::not-ipv6:::",
    });

    await Promise.resolve();

    expect(mocks.infoMock).toHaveBeenCalledWith(
      expect.stringContaining("security_event"),
      expect.objectContaining({
        securityEvent: expect.objectContaining({ ipAddress: "xxxx:xxxx:xxxx::" }),
      }),
    );
  });

  it("forwards high-severity events to Sentry", async () => {
    emitSecurityEvent({
      eventId: "evt-4",
      requestId: "req-4",
      occurredAt: new Date().toISOString(),
      event: "auth.security.token_replay_detected",
      detail: "replay",
    });

    await Promise.resolve();

    expect(mocks.breadcrumbMock).toHaveBeenCalled();
    expect(mocks.sentrySecurityMock).toHaveBeenCalled();
  });
});
