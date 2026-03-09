import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional().default("4004"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  STRIPE_SECRET_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
