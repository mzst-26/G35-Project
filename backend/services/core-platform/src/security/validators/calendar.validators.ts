import { isoDateSchema, uuidV4Schema } from "@infra/shared-validation";
import { z } from "zod";

const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM format required");

export const calendarPathParamsSchema = z
  .object({
    workerId: uuidV4Schema,
  })
  .strict();

export const availabilityPathParamsSchema = z
  .object({
    workerId: uuidV4Schema,
    id: uuidV4Schema,
  })
  .strict();

export const createAvailabilitySchema = z
  .object({
    date: isoDateSchema,
    startTime: hhmmSchema,
    endTime: hhmmSchema,
    recurring: z.boolean().default(false),
  })
  .strict()
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const updateAvailabilitySchema = z
  .object({
    date: isoDateSchema.optional(),
    startTime: hhmmSchema.optional(),
    endTime: hhmmSchema.optional(),
    recurring: z.boolean().optional(),
    available: z.boolean().optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((data) => {
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true;
  }, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const deleteAvailabilitySchema = z
  .object({
    version: z.coerce.number().int().positive(),
  })
  .strict();

export const listAvailabilityQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .strict();

export type CreateAvailabilityBody = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityBody = z.infer<typeof updateAvailabilitySchema>;
export type DeleteAvailabilityQuery = z.infer<typeof deleteAvailabilitySchema>;
export type ListAvailabilityQuery = z.infer<typeof listAvailabilityQuerySchema>;
