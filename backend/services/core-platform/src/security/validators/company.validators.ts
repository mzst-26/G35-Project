import { limitSchema, uuidV4Schema } from "@infra/shared-validation";
import { z } from "zod";

const companyStatusSchema = z.enum(["pending", "approved", "rejected", "suspended"]);

export const companyPathParamsSchema = z.object({ companyId: uuidV4Schema }).strict();

export const updateCompanySchema = z
  .object({
    companyName: z.string().min(2).max(120).optional(),
    addressLine1: z.string().max(255).nullable().optional(),
    addressLine2: z.string().max(255).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    postcode: z.string().max(32).nullable().optional(),
    bio: z.string().max(2000).nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    website: z.string().url().nullable().optional(),
  })
  .strict();

export const listCompaniesQuerySchema = z
  .object({
    status: companyStatusSchema.optional(),
    limit: limitSchema,
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export const adminCompanyStatusUpdateSchema = z
  .object({
    status: companyStatusSchema,
    reason: z.string().max(500).optional(),
  })
  .strict();
