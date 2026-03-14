import pino from "pino";

export const createLogger = (serviceName: string) =>
  pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || "info"
  });

export { EMAIL_MAX_LENGTH, EMAIL_REGEX, isValidEmail } from "./email.js";
