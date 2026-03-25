import { vi } from "vitest";
import type { CalendarRepository } from "../../src/repositories/calendar.repository.js";

export function createMockCalendarRepository(
  overrides: Partial<CalendarRepository> = {},
): CalendarRepository {
  return {
    findAvailabilityById: vi.fn().mockResolvedValue(null),
    findAvailabilityForWorker: vi.fn().mockResolvedValue([]),
    createAvailability: vi.fn(),
    updateAvailability: vi.fn(),
    deleteAvailability: vi.fn().mockResolvedValue(undefined),
    findOverlappingJobs: vi.fn().mockResolvedValue([]),
    writeAuditEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
