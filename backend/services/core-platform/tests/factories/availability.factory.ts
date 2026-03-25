import type { WorkerAvailability } from "../../src/domain/calendar/calendar.types.js";

export function buildAvailability(overrides: Partial<WorkerAvailability> = {}): WorkerAvailability {
  const base: WorkerAvailability = {
    id: "11111111-1111-4111-8111-111111111111",
    workerId: "22222222-2222-4222-8222-222222222222",
    date: "2026-04-10",
    startTime: "08:00",
    endTime: "17:00",
    recurring: false,
    available: true,
    locked: false,
    originalAvailability: null,
    version: 1,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };

  return { ...base, ...overrides };
}
