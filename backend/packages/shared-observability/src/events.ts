// Typed security and domain event emitter.
//
// All domain-significant events must be emitted through this module.
// This ensures a consistent event taxonomy and co-located Sentry integration.
// Consumers register listeners and react (e.g. audit-log, alert, metrics).

import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Event taxonomy — every event that core-platform may emit
// ---------------------------------------------------------------------------

export type SecurityEventMap = {
  "job.status.transition.denied": {
    jobId: string;
    from: string;
    to: string;
    userId: string;
    requestId?: string;
  };
  "job.status.changed": {
    jobId: string;
    from: string;
    to: string;
    actorId: string;
    requestId?: string;
  };
  "calendar.availability.lock_violation": {
    workerId: string;
    availabilityId: string;
    jobId: string;
    requestId?: string;
  };
  "calendar.availability.change_fee_candidate": {
    workerId: string;
    jobId: string;
    requestId?: string;
  };
  "admin.override.used": {
    adminId: string;
    targetId: string;
    action: string;
    requestId?: string;
  };
  "company.profile.suspended_action_attempt": {
    companyId: string;
    userId: string;
    requestId?: string;
  };
  "db.write.critical_transition_failed": {
    jobId: string;
    error: string;
    requestId?: string;
  };
};

// ---------------------------------------------------------------------------
// Typed emitter class
// ---------------------------------------------------------------------------

class SecurityEventEmitter extends EventEmitter {
  override emit<K extends keyof SecurityEventMap>(
    event: K,
    data: SecurityEventMap[K],
  ): boolean {
    return super.emit(event as string, data);
  }

  override on<K extends keyof SecurityEventMap>(
    event: K,
    listener: (data: SecurityEventMap[K]) => void,
  ): this {
    return super.on(event as string, listener);
  }

  override once<K extends keyof SecurityEventMap>(
    event: K,
    listener: (data: SecurityEventMap[K]) => void,
  ): this {
    return super.once(event as string, listener);
  }

  override off<K extends keyof SecurityEventMap>(
    event: K,
    listener: (data: SecurityEventMap[K]) => void,
  ): this {
    return super.off(event as string, listener);
  }
}

// Singleton emitter — import this in services that need to emit or listen.
export const securityEvents = new SecurityEventEmitter();
