import type { AdminSettings } from '@/types/admin-settings';
import type { CompanyJob, CompanyJobStatus } from '@/types/company-jobs';
import { normalizeCompanyJobStatus } from '@/types/company-jobs';
import type { CompanyJobDetail, CompanyJobTimelineItem } from '@/types/company-job-detail';
import type { CompanyPaymentDetail, CompanyPaymentListItem } from '@/types/company-payments';
import type { TradePenalty, TradeUpcomingJob } from '@/types/trade-dashboard';
import { normalizeTradeJobStatus } from '@/types/trade-dashboard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pickDate(value: unknown, fallback = ''): string {
  const raw = asString(value, fallback);
  return raw.includes('T') ? raw.split('T')[0] : raw;
}

function getStatus(value: unknown): string {
  return asString(value, 'draft');
}

function toCompanyStatus(value: unknown): CompanyJobStatus {
  return normalizeCompanyJobStatus(
    getStatus(value) as Parameters<typeof normalizeCompanyJobStatus>[0],
  );
}

function toTradeDate(value: unknown): string {
  return pickDate(value, new Date().toISOString().split('T')[0]);
}

function toTimeline(job: Record<string, unknown>): CompanyJobTimelineItem[] {
  const timeline: CompanyJobTimelineItem[] = [];
  const createdAt = asString(job.createdAt, '');
  const startedAt = asNullableString(job.startedAt);
  const completedAt = asNullableString(job.completedAt);

  if (createdAt) {
    timeline.push({ date: pickDate(createdAt), event: 'Job created', status: 'completed' });
  }

  if (startedAt) {
    timeline.push({ date: pickDate(startedAt), event: 'Job started', status: 'completed' });
  }

  if (completedAt) {
    timeline.push({ date: pickDate(completedAt), event: 'Job completed', status: 'completed' });
  }

  if (timeline.length === 0) {
    timeline.push({ date: 'TBD', event: 'Awaiting schedule', status: 'pending' });
  }

  return timeline;
}

function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (isRecord(payload) && Array.isArray(payload.items)) {
    return payload.items.filter(isRecord);
  }

  if (isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.items)) {
    return payload.data.items.filter(isRecord);
  }

  return [];
}

export function toCompanyJobs(payload: unknown): CompanyJob[] {
  return extractItems(payload).map((item) => {
    const id = asString(item.id, '');
    const location = asString(item.location) || asString(item.address) || 'Unknown location';

    return {
      id,
      title: asString(item.title, 'Untitled job'),
      trade: asString(item.trade) || asString(item.tradeType) || 'Trade',
      status: toCompanyStatus(item.status),
      sourceStatus: getStatus(item.status) as CompanyJob['sourceStatus'],
      workers: asNumber(item.workersNeeded, 1),
      date: pickDate(item.startAt, pickDate(item.createdAt, 'TBD')),
      location,
    };
  });
}

export function toCompanyJobDetail(payload: unknown): CompanyJobDetail | null {
  if (!isRecord(payload)) {
    return null;
  }

  const source = isRecord(payload.data) ? payload.data : payload;
  const status = toCompanyStatus(source.status);

  return {
    id: asString(source.id, ''),
    title: asString(source.title, 'Untitled job'),
    sourceStatus: getStatus(source.status) as CompanyJobDetail['sourceStatus'],
    company: asString(source.companyName) || asString(source.company) || 'Company',
    trade: asString(source.trade) || asString(source.tradeType) || 'Trade',
    status,
    location: asString(source.location) || 'Unknown location',
    address: asString(source.address) || asString(source.location) || 'Unknown address',
    startDate: pickDate(source.startAt, pickDate(source.createdAt, 'TBD')),
    endDate: pickDate(source.endAt, pickDate(source.startAt, 'TBD')),
    workersNeeded: asNumber(source.workersNeeded, 1),
    description: asString(source.description, 'No description provided.'),
    requirements: Array.isArray(source.requirements)
      ? source.requirements.filter((req): req is string => typeof req === 'string')
      : [],
    dailyRate: asNumber(source.dailyRate, 0),
    allocatedWorkers: Array.isArray(source.allocatedWorkers)
      ? source.allocatedWorkers.filter(isRecord).map((worker) => ({
          id: asString(worker.id, ''),
          name: asString(worker.name, 'Worker'),
          phone: asString(worker.phone, ''),
          email: asString(worker.email, ''),
          rating: asNumber(worker.rating, 0),
          jobsCompleted: asNumber(worker.jobsCompleted, 0),
        }))
      : [],
    paymentId: asNullableString(source.paymentId),
    paymentStatus: asString(source.paymentStatus, 'unpaid') as CompanyJobDetail['paymentStatus'],
    createdAt: asString(source.createdAt, new Date().toISOString()),
    startedAt: asNullableString(source.startedAt),
    completedAt: asNullableString(source.completedAt),
    platformFee: asNumber(source.platformFee, 0),
    labourCost: asNumber(source.labourCost, 0),
    totalCost: asNumber(source.totalCost, 0),
    timeline: toTimeline(source),
  };
}

export function toCompanyPayments(payload: unknown): CompanyPaymentListItem[] {
  return extractItems(payload).map((item) => ({
    id: asString(item.id, ''),
    jobId: asString(item.jobId, ''),
    jobTitle: asString(item.jobTitle, 'Untitled job'),
    status: asString(item.status, 'unpaid') as CompanyPaymentListItem['status'],
    date: pickDate(item.date, pickDate(item.createdAt, 'TBD')),
    invoice: asString(item.invoice, 'N/A'),
    paymentMethod: asNullableString(item.paymentMethod),
    labourCost: asNumber(item.labourCost, 0),
    platformFee: asNumber(item.platformFee, 0),
    totalAmount: asNumber(item.totalAmount, 0),
  }));
}

export function toCompanyPaymentDetail(payload: unknown): CompanyPaymentDetail | null {
  if (!isRecord(payload)) {
    return null;
  }

  const source = isRecord(payload.data) ? payload.data : payload;

  return {
    id: asString(source.id, ''),
    jobId: asString(source.jobId, ''),
    jobTitle: asString(source.jobTitle, 'Untitled job'),
    status: asString(source.status, 'unpaid') as CompanyPaymentDetail['status'],
    date: pickDate(source.date, pickDate(source.createdAt, 'TBD')),
    invoice: asString(source.invoice, 'N/A'),
    paymentMethod: asNullableString(source.paymentMethod),
    labourCost: asNumber(source.labourCost, 0),
    platformFee: asNumber(source.platformFee, 0),
    totalAmount: asNumber(source.totalAmount, 0),
    createdAt: asString(source.createdAt, new Date().toISOString()),
    paidAt: asNullableString(source.paidAt),
    releasedAt: asNullableString(source.releasedAt),
    platformFeePaid: asBoolean(source.platformFeePaid, false),
    labourCostHeld: asBoolean(source.labourCostHeld, false),
    transactions: Array.isArray(source.transactions)
      ? source.transactions.filter(isRecord).map((txn) => ({
          id: asString(txn.id, ''),
          date: asString(txn.date, new Date().toISOString()),
          description: asString(txn.description, 'Transaction'),
          amount: asNumber(txn.amount, 0),
          status: asString(txn.status, 'pending') as CompanyPaymentDetail['transactions'][number]['status'],
          type: asString(txn.type, 'platform-fee') as CompanyPaymentDetail['transactions'][number]['type'],
        }))
      : [],
    pendingStripeHold: isRecord(source.pendingStripeHold)
      ? {
          amount: asNumber(source.pendingStripeHold.amount, 0),
          scheduledDate: asString(source.pendingStripeHold.scheduledDate, ''),
          description: asString(source.pendingStripeHold.description, ''),
        }
      : undefined,
  };
}

export function toTradeJobs(payload: unknown): TradeUpcomingJob[] {
  return extractItems(payload).map((item) => {
    const startDate = asString(item.startAt, '');
    const endDate = asString(item.endAt, '');
    const date = toTradeDate(startDate || endDate || item.createdAt);
    const dailyRate = asNumber(item.dailyRate, 0);
    const sourceStatus = getStatus(item.status) as Parameters<typeof normalizeTradeJobStatus>[0];
    const normalizedStatus = normalizeTradeJobStatus(sourceStatus);

    return {
      id: asString(item.id, ''),
      title: asString(item.title, 'Untitled job'),
      company: asString(item.companyName, 'Company'),
      location: asString(item.location, 'Unknown location'),
      date,
      pay: dailyRate,
      days: 1,
      status: normalizedStatus,
      sourceStatus: sourceStatus as TradeUpcomingJob['sourceStatus'],
      description: asString(item.description),
      completedDate: normalizedStatus === 'completed' ? date : undefined,
    };
  });
}

export function toTradePenalties(payload: unknown): TradePenalty[] {
  return extractItems(payload).map((item) => ({
    id: asString(item.id, ''),
    reason: asString(item.reason, 'Penalty'),
    amount: asNumber(item.amount, 0),
    date: pickDate(item.date, 'TBD'),
    status: asString(item.status, 'unpaid') as TradePenalty['status'],
    description: asString(item.description),
    referenceJob: asString(item.referenceJob),
  }));
}

export function toAdminSettings(payload: unknown): AdminSettings {
  if (!isRecord(payload)) {
    return {
      general: {
        fullName: '',
        email: '',
        phoneNumber: '',
        adminLevel: '',
      },
      notifications: {
        emailNotifications: false,
        newUserAlerts: false,
        appealAlerts: false,
        supportTicketAlerts: false,
        systemAlerts: false,
      },
      payments: {
        platformFeePercent: null,
        lateCancellationFee: null,
        noShowFee: null,
        lateArrivalFee: null,
      },
      jobs: {
        maxJobsPerTrade: null,
        jobCancellationWindowHours: null,
      },
      users: {
        autoSuspensionThreshold: null,
      },
    };
  }

  const source = isRecord(payload.data) ? payload.data : payload;

  const general = isRecord(source.general) ? source.general : {};
  const notifications = isRecord(source.notifications) ? source.notifications : {};
  const payments = isRecord(source.payments) ? source.payments : {};
  const jobs = isRecord(source.jobs) ? source.jobs : {};
  const users = isRecord(source.users) ? source.users : {};

  return {
    general: {
      fullName: asString(general.fullName),
      email: asString(general.email),
      phoneNumber: asString(general.phoneNumber),
      adminLevel: asString(general.adminLevel),
    },
    notifications: {
      emailNotifications: asBoolean(notifications.emailNotifications),
      newUserAlerts: asBoolean(notifications.newUserAlerts),
      appealAlerts: asBoolean(notifications.appealAlerts),
      supportTicketAlerts: asBoolean(notifications.supportTicketAlerts),
      systemAlerts: asBoolean(notifications.systemAlerts),
    },
    payments: {
      platformFeePercent: typeof payments.platformFeePercent === 'number' ? payments.platformFeePercent : null,
      lateCancellationFee: typeof payments.lateCancellationFee === 'number' ? payments.lateCancellationFee : null,
      noShowFee: typeof payments.noShowFee === 'number' ? payments.noShowFee : null,
      lateArrivalFee: typeof payments.lateArrivalFee === 'number' ? payments.lateArrivalFee : null,
    },
    jobs: {
      maxJobsPerTrade: typeof jobs.maxJobsPerTrade === 'number' ? jobs.maxJobsPerTrade : null,
      jobCancellationWindowHours:
        typeof jobs.jobCancellationWindowHours === 'number' ? jobs.jobCancellationWindowHours : null,
    },
    users: {
      autoSuspensionThreshold:
        typeof users.autoSuspensionThreshold === 'number' ? users.autoSuspensionThreshold : null,
    },
  };
}
