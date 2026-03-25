import { describe, expect, it } from "vitest";
import { JobStatus } from "../../../src/domain/jobs/jobs.types.js";
import { checkCalendarLock } from "../../../src/domain/calendar/calendar.lock.js";

const now = new Date("2026-03-01T10:00:00.000Z");
const availabilityDate = new Date("2026-03-05T00:00:00.000Z");

describe("checkCalendarLock", () => {
  it("locks when change is 3 days before a filled job", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [
        { id: "job-1", status: JobStatus.FILLED, startAt: new Date("2026-03-04T09:00:00.000Z") },
      ],
    });

    expect(result.locked).toBe(true);
    expect(result.lockingJobId).toBe("job-1");
  });

  it("does not lock for an open job within 3 days", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [
        { id: "job-1", status: JobStatus.OPEN, startAt: new Date("2026-03-04T09:00:00.000Z") },
      ],
    });

    expect(result.locked).toBe(false);
  });

  it("does not lock when a filled job starts 8 days away", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [
        { id: "job-1", status: JobStatus.FILLED, startAt: new Date("2026-03-09T09:00:00.000Z") },
      ],
    });

    expect(result.locked).toBe(false);
  });

  it("marks fee candidate when a filled job starts in 1 day", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [
        { id: "job-1", status: JobStatus.FILLED, startAt: new Date("2026-03-02T08:00:00.000Z") },
      ],
      changeFeeWindowHours: 48,
    });

    expect(result.locked).toBe(true);
    expect(result.changeFeeCandidate).toBe(true);
  });

  it("does not lock for completed jobs", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [
        { id: "job-1", status: JobStatus.COMPLETED, startAt: new Date("2026-03-04T09:00:00.000Z") },
      ],
    });

    expect(result.locked).toBe(false);
  });

  it("does not lock when there are no overlapping jobs", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [],
    });

    expect(result.locked).toBe(false);
    expect(result.changeFeeCandidate).toBe(false);
  });

  it("locks on the correct job when only one job is locking", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now,
      jobs: [
        { id: "job-open", status: JobStatus.OPEN, startAt: new Date("2026-03-03T09:00:00.000Z") },
        { id: "job-filled", status: JobStatus.FILLED, startAt: new Date("2026-03-05T09:00:00.000Z") },
      ],
    });

    expect(result.locked).toBe(true);
    expect(result.lockingJobId).toBe("job-filled");
  });

  it("locks exactly at the 7-day UTC midnight boundary", () => {
    const result = checkCalendarLock({
      availabilityDate,
      now: new Date("2026-03-01T23:59:59.000Z"),
      jobs: [
        { id: "job-edge", status: JobStatus.FILLED, startAt: new Date("2026-03-08T00:00:00.000Z") },
      ],
    });

    expect(result.locked).toBe(true);
    expect(result.lockingJobId).toBe("job-edge");
  });
});
