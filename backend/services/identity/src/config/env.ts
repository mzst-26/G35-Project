import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional().default("4001"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_ISSUER: z.string().default("infra"),
  JWT_AUDIENCE: z.string().default("infra-clients")
});

export const env = envSchema.parse(process.env);
