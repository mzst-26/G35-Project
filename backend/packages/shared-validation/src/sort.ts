import { z } from "zod";

export const sortQuerySchema = z.object({
  sortBy: z
    .string()
    .min(1, "sortBy must not be empty.")
    .regex(/^[a-zA-Z0-9_.]+$/, "sortBy may only contain letters, numbers, underscore, and dot.")
    .optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type SortQuery = z.infer<typeof sortQuerySchema>;
