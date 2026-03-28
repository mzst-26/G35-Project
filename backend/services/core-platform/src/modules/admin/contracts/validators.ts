import { z } from "zod";

export const relayOutboxSchema = z
  .object({
    limit: z.coerce.number().int().positive().max(500).default(100),
  })
  .strict();

export const cleanupIdempotencySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(1000).default(500),
  })
  .strict();

export const adminSettingsSchema = z
  .object({
    general: z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phoneNumber: z.string(),
      adminLevel: z.string().min(1),
    }).strict(),
    notifications: z.object({
      emailNotifications: z.boolean(),
      newUserAlerts: z.boolean(),
      appealAlerts: z.boolean(),
      supportTicketAlerts: z.boolean(),
      systemAlerts: z.boolean(),
    }).strict(),
    payments: z.object({
      platformFeePercent: z.number().min(0).max(100).nullable(),
      lateCancellationFee: z.number().min(0).nullable(),
      noShowFee: z.number().min(0).nullable(),
      lateArrivalFee: z.number().min(0).nullable(),
    }).strict(),
    jobs: z.object({
      maxJobsPerTrade: z.number().int().min(0).nullable(),
      jobCancellationWindowHours: z.number().int().min(0).nullable(),
    }).strict(),
    users: z.object({
      autoSuspensionThreshold: z.number().int().min(0).nullable(),
    }).strict(),
  })
  .strict();

export const listPenaltiesQuerySchema = z
  .object({
    status: z.enum(["pending", "charged", "waived", "disputed", "refunded"]).optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();
