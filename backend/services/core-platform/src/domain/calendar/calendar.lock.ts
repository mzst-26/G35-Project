import { JobStatus } from "../jobs/jobs.types.js";

const HOURS_PER_DAY = 24;
const DAY_MS = HOURS_PER_DAY * 60 * 60 * 1000;
const DEFAULT_CHANGE_FEE_WINDOW_HOURS = 48;

export interface LockCheckInput {
  availabilityDate: Date;
  jobs: Array<{ id: string; status: JobStatus; startAt: Date }>;
  now?: Date;
  changeFeeWindowHours?: number;
}

export interface LockCheckResult {
  locked: boolean;
  lockingJobId?: string;
  changeFeeCandidate: boolean;
  reason?: string;
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function hoursUntil(now: Date, target: Date): number {
  return (target.getTime() - now.getTime()) / (60 * 60 * 1000);
}

export function checkCalendarLock(input: LockCheckInput): LockCheckResult {
  const now = input.now ?? new Date();
  const nowMidnightUtc = toUtcMidnight(now);
  const feeWindowHours = input.changeFeeWindowHours ?? DEFAULT_CHANGE_FEE_WINDOW_HOURS;

  let lockingJob: { id: string; startAt: Date } | null = null;

  for (const job of input.jobs) {
    if (job.status !== JobStatus.FILLED && job.status !== JobStatus.IN_PROGRESS) {
      continue;
    }

    const jobStartMidnightUtc = toUtcMidnight(job.startAt);
    const dayDelta = (jobStartMidnightUtc.getTime() - nowMidnightUtc.getTime()) / DAY_MS;

    if (dayDelta < 0 || dayDelta > 7) {
      continue;
    }

    if (!lockingJob || job.startAt.getTime() < lockingJob.startAt.getTime()) {
      lockingJob = { id: job.id, startAt: job.startAt };
    }
  }

  if (!lockingJob) {
    return {
      locked: false,
      changeFeeCandidate: false,
      reason: "No committed job starts within 7 days.",
    };
  }

  const hoursToStart = hoursUntil(now, lockingJob.startAt);
  const changeFeeCandidate = hoursToStart >= 0 && hoursToStart <= feeWindowHours;

  return {
    locked: true,
    lockingJobId: lockingJob.id,
    changeFeeCandidate,
    reason: `Committed job ${lockingJob.id} starts within 7 days.`,
  };
}
