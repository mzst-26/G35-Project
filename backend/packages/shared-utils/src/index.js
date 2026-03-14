import pino from "pino";
export const createLogger = (serviceName) => pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || "info"
});
