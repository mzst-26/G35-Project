import { isoDateSchema, limitSchema, uuidV4Schema } from "@infra/shared-validation";
import { z } from "zod";
import { JobStatus } from "../domain/types.js";

const offsetSchema = z.coerce.number().int().min(0).max(10_000).default(0);

export const createJobSchema = z
  .object({
    title: z.string().min(3).max(100),
    description: z.string().max(2000).optional(),
    startAt: isoDateSchema,
    endAt: isoDateSchema,
    salary: z.number().positive(),
    currency: z.enum(["GBP", "USD", "EUR"]),
    companyId: uuidV4Schema,
  })
  .strict()
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "endAt must be after startAt.",
    path: ["endAt"],
  });

export const updateJobSchema = z
  .object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
    startAt: isoDateSchema.optional(),
    endAt: isoDateSchema.optional(),
    salary: z.number().positive().optional(),
    currency: z.enum(["GBP", "USD", "EUR"]).optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine(
    (d) => {
      if (d.startAt && d.endAt) {
        return new Date(d.endAt) > new Date(d.startAt);
      }
      return true;
    },
    { message: "endAt must be after startAt.", path: ["endAt"] },
  );

export const transitionStatusSchema = z
  .object({
    status: z.nativeEnum(JobStatus),
    reason: z.string().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const listJobsQuerySchema = z
  .object({
    limit: limitSchema,
    offset: offsetSchema,
    companyId: uuidV4Schema.optional(),
    status: z.nativeEnum(JobStatus).optional(),
  })
  .strict();

export type CreateJobBody = z.infer<typeof createJobSchema>;
export type UpdateJobBody = z.infer<typeof updateJobSchema>;
export type TransitionStatusBody = z.infer<typeof transitionStatusSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
