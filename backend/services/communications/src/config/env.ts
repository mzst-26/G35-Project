import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional().default("4005"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);
