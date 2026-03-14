/**
 * Security module barrel.
 * Import all security utilities and middleware from here.
 */

export {
  OtpRequestSchema,
  OtpVerifySchema,
  SessionRefreshSchema,
  LogoutSchema,
  MfaEnrollSchema,
  MfaChallengeSchema,
  MfaVerifySchema,
  MfaRevokeParamsSchema,
  parseOrThrow,
} from "./validators.js";

export type {
  OtpRequestInput,
  OtpVerifyInput,
  SessionRefreshInput,
  LogoutInput,
  MfaEnrollInput,
  MfaChallengeInput,
  MfaVerifyInput,
  MfaRevokeParams,
} from "./validators.js";

export { generateCsrfToken, validateCsrfToken, csrfProtection } from "./csrf.js";
export { createRateLimiter, RATE_LIMIT_PROFILES } from "./rateLimit.js";
export type { RateLimitProfile } from "./rateLimit.js";
