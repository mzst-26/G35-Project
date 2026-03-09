import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional().default("4002"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const env = envSchema.parse(process.env);
