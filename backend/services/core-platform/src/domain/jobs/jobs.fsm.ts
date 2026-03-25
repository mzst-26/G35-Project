import { InvalidStatusTransitionError } from "@infra/shared-errors";
import { JobStatus } from "./jobs.types.js";

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.OPEN],
  [JobStatus.OPEN]: [JobStatus.FILLED, JobStatus.CANCELLED],
  [JobStatus.FILLED]: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],
  [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED, JobStatus.DISPUTED],
  [JobStatus.COMPLETED]: [],
  [JobStatus.CANCELLED]: [],
  [JobStatus.DISPUTED]: [JobStatus.RESOLVED, JobStatus.CANCELLED],
  [JobStatus.RESOLVED]: [],
};

export function assertValidTransition(from: JobStatus, to: JobStatus): void {
  const allowed = TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

export function getAllowedTransitions(from: JobStatus): JobStatus[] {
  return [...TRANSITIONS[from]];
}

export function isTerminalStatus(status: JobStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** For exhaustive security tests — all ordered pairs (from, to). */
export function allStatusPairs(): { from: JobStatus; to: JobStatus }[] {
  const statuses = Object.values(JobStatus) as JobStatus[];
  const pairs: { from: JobStatus; to: JobStatus }[] = [];
  for (const from of statuses) {
    for (const to of statuses) {
      pairs.push({ from, to });
    }
  }
  return pairs;
}

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
