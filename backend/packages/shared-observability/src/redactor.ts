// PII redactor for structured logs and Sentry payloads.
//
// Rules:
//  - Email, phone, name, address fields must never appear in logs or Sentry.
//  - The redactor replaces matching keys with '[REDACTED]' at any depth.
//  - IPv4 addresses are truncated to /24 to retain geographic context.
//  - Non-PII fields are passed through unmodified.

export const PII_FIELD_NAMES = [
  "email",
  "phone",
  "phoneNumber",
  "name",
  "fullName",
  "firstName",
  "lastName",
  "address",
  "street",
  "postcode",
  "zipCode",
  "city",
] as const;

// Pino redact paths — used when constructing the logger in production.
// Covers top-level and one level of nesting. Extend as needed for deeper paths.
export const PII_REDACT_PATHS: string[] = [
  ...PII_FIELD_NAMES,
  ...PII_FIELD_NAMES.map((f) => `*.${f}`),
  ...PII_FIELD_NAMES.map((f) => `*.*.${f}`),
];

// Truncates an IPv4 address to /24 (replaces last octet with "x") to
// preserve coarse geographic context without logging host-level identifiers.
export function truncateIpAddress(ip: string): string {
  if (!ip) return "x.x.x.x";

  if (ip.includes(":")) {
    // IPv6 — keep only the first 3 groups
    const parts = ip.split(":");
    return `${parts.slice(0, 3).join(":")}:xxxx:xxxx:xxxx:xxxx:xxxx`;
  }

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }

  return "x.x.x.x";
}

// Shallow-redacts a plain object: replaces PII field values with '[REDACTED]'.
// Does NOT mutate the original. For deep redaction, use the pino redact option.
export function redactPii<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if ((PII_FIELD_NAMES as readonly string[]).includes(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}
