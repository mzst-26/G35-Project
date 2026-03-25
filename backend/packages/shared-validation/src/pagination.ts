import { z } from "zod";
import { cursorSchema, limitSchema } from "./primitives.js";

export const paginationQuerySchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
