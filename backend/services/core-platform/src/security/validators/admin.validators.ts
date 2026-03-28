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
