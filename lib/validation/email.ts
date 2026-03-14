/**
 * Email validation shared with backend (see backend/packages/shared-utils/src/email.ts).
 * Kept in sync so client and server reject the same invalid values.
 */

export const EMAIL_MAX_LENGTH = 254;

/** Same pattern as backend: local@domain.tld, no whitespace. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_REGEX.test(trimmed);
}
