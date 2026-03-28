import { limitSchema, uuidV4Schema } from "@infra/shared-validation";
import { z } from "zod";

const workerVerificationSchema = z.enum(["pending", "verified", "rejected", "suspended"]);

export const workerPathParamsSchema = z.object({ workerId: uuidV4Schema }).strict();

export const updateWorkerSchema = z
  .object({
    qualifications: z.string().max(2000).nullable().optional(),
    addressLine1: z.string().max(255).nullable().optional(),
    addressLine2: z.string().max(255).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    locationLng: z.number().min(-180).max(180).nullable().optional(),
    locationLat: z.number().min(-90).max(90).nullable().optional(),
    bio: z.string().max(2000).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    hourlyRate: z.number().positive().nullable().optional(),
    verifiedStatus: workerVerificationSchema.optional(),
  })
  .strict();

export const listWorkersQuerySchema = z
  .object({
    verifiedStatus: workerVerificationSchema.optional(),
    limit: limitSchema,
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export const adminWorkerVerificationUpdateSchema = z
  .object({
    status: workerVerificationSchema,
    reason: z.string().max(500).optional(),
  })
  .strict();
