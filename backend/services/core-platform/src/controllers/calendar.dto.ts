import type { WorkerAvailability } from "../domain/calendar/calendar.types.js";

export function availabilityToJson(availability: WorkerAvailability) {
  return {
    id: availability.id,
    workerId: availability.workerId,
    date: availability.date,
    startTime: availability.startTime,
    endTime: availability.endTime,
    recurring: availability.recurring,
    available: availability.available,
    locked: availability.locked,
    version: availability.version,
    createdAt: availability.createdAt,
    updatedAt: availability.updatedAt,
  };
}
