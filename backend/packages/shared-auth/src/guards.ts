import type { AuthenticatedUser } from "./types.js";
import { UnauthorisedError } from "@infra/shared-errors";

// Returns true if value is a valid AuthenticatedUser shape.
export function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.userId === "string" &&
    obj.userId.length > 0 &&
    typeof obj.email === "string" &&
    typeof obj.role === "string"
  );
}

// Asserts that value is an AuthenticatedUser — throws UnauthorisedError otherwise.
// Use in middleware after token verification to guarantee req.user is populated.
export function assertAuthenticatedUser(
  value: unknown,
  message = "Authentication required.",
): asserts value is AuthenticatedUser {
  if (!isAuthenticatedUser(value)) {
    throw new UnauthorisedError(message, "UNAUTHORISED");
  }
}
