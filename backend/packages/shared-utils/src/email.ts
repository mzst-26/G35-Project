/**
 * Reusable email validation for microservices.
 * Single source of truth for format and length so all services stay consistent.
 */

/** Maximum length for an email address (RFC 5321 path). */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Permissive but safe pattern: non-empty local part, @, non-empty domain with at least one dot.
 * Aligns with common usage and avoids catastrophic backtracking.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns true if the value is a non-empty string that looks like a valid email
 * and does not exceed EMAIL_MAX_LENGTH.
 */
export function isValidEmail(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_REGEX.test(trimmed);
}
