import { describe, expect, it } from "vitest";
import { InvalidStatusTransitionError } from "@infra/shared-errors";
import {
  allStatusPairs,
  assertValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isValidTransition,
} from "../../../src/domain/jobs/jobs.fsm.js";
import { JobStatus } from "../../../src/domain/jobs/jobs.types.js";

describe("jobs.fsm", () => {
  it("allows every transition defined in the FSM map", () => {
    const pairs: Array<[JobStatus, JobStatus]> = [
      [JobStatus.DRAFT, JobStatus.OPEN],
      [JobStatus.OPEN, JobStatus.FILLED],
      [JobStatus.OPEN, JobStatus.CANCELLED],
      [JobStatus.FILLED, JobStatus.IN_PROGRESS],
      [JobStatus.FILLED, JobStatus.CANCELLED],
      [JobStatus.IN_PROGRESS, JobStatus.COMPLETED],
      [JobStatus.IN_PROGRESS, JobStatus.DISPUTED],
      [JobStatus.DISPUTED, JobStatus.RESOLVED],
      [JobStatus.DISPUTED, JobStatus.CANCELLED],
    ];
    for (const [from, to] of pairs) {
      expect(() => assertValidTransition(from, to)).not.toThrow();
      expect(isValidTransition(from, to)).toBe(true);
    }
  });

  it("rejects every undefined transition with InvalidStatusTransitionError", () => {
    for (const { from, to } of allStatusPairs()) {
      if (isValidTransition(from, to)) continue;
      expect(() => assertValidTransition(from, to)).toThrow(InvalidStatusTransitionError);
      try {
        assertValidTransition(from, to);
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidStatusTransitionError);
        expect((e as InvalidStatusTransitionError).from).toBe(from);
        expect((e as InvalidStatusTransitionError).to).toBe(to);
      }
    }
  });

  it("returns empty allowed transitions for terminal states", () => {
    expect(getAllowedTransitions(JobStatus.COMPLETED)).toEqual([]);
    expect(getAllowedTransitions(JobStatus.CANCELLED)).toEqual([]);
    expect(getAllowedTransitions(JobStatus.RESOLVED)).toEqual([]);
  });

  it("isTerminalStatus is true for completed, cancelled, and resolved", () => {
    expect(isTerminalStatus(JobStatus.COMPLETED)).toBe(true);
    expect(isTerminalStatus(JobStatus.CANCELLED)).toBe(true);
    expect(isTerminalStatus(JobStatus.RESOLVED)).toBe(true);
    expect(isTerminalStatus(JobStatus.DRAFT)).toBe(false);
    expect(isTerminalStatus(JobStatus.OPEN)).toBe(false);
  });
});
