// Identity token verification client.
//
// Core Platform calls Identity's internal endpoint to verify tokens rather than
// validating JWTs directly. Identity is the single source of truth for sessions.
//
// Security rules:
//  - Never log the raw token — log only the first 8 chars as a debugging hint.
//  - IDENTITY_SERVICE_URL and INTERNAL_SECRET must be set; fail fast otherwise.
//  - Throws UnauthorisedError on 401/invalid token.
//  - Throws ServiceUnavailableError on network failure or Identity 5xx.

import type { AuthenticatedUser } from "./types.js";
import { UnauthorisedError, ServiceUnavailableError } from "@infra/shared-errors";
import type { UserRole } from "@infra/shared-permissions";
import { UserRole as UserRoleEnum } from "@infra/shared-permissions";
import { z } from "zod";

// Shape returned by Identity /api/internal/token/verify
interface IdentityTokenResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    stepUpVerified?: boolean;
    expiresAt?: number;
  };
  error?: string;
}

const identityUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(UserRoleEnum),
  stepUpVerified: z.boolean().optional(),
  expiresAt: z.number().optional(),
});

// Maps Identity's user shape (uses `id`) to our AuthenticatedUser (uses `userId`).
function mapIdentityUser(
  identityUser: NonNullable<IdentityTokenResponse["user"]>,
): AuthenticatedUser {
  return {
    userId: identityUser.id,
    email: identityUser.email,
    role: identityUser.role,
    stepUpVerified: identityUser.stepUpVerified,
    expiresAt: identityUser.expiresAt,
  };
}

// Verifies a bearer token by calling Identity's internal endpoint.
//
// @param token - The raw access token from the Authorization header or cookie.
// @throws UnauthorisedError if the token is invalid or the session is revoked.
// @throws ServiceUnavailableError if Identity is unreachable or returns 5xx.
export async function verifyToken(token: string): Promise<AuthenticatedUser> {
  const identityUrl = process.env.IDENTITY_SERVICE_URL;
  const internalSecret = process.env.INTERNAL_SECRET;

  if (!identityUrl || !internalSecret) {
    throw new ServiceUnavailableError(
      "Identity service is not configured (IDENTITY_SERVICE_URL / INTERNAL_SECRET missing).",
    );
  }

  // Never log `token`. If logging is required at a call site, log at most the first 8 chars.

  let response: Response;
  try {
    response = await fetch(`${identityUrl}/api/internal/token/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000), // 5s timeout — Identity should respond fast
    });
  } catch (cause) {
    throw new ServiceUnavailableError("Identity service is unreachable.", cause);
  }

  if (response.status === 401) {
    throw new UnauthorisedError("Token verification failed.", "TOKEN_INVALID");
  }

  if (!response.ok) {
    throw new ServiceUnavailableError(
      `Identity service returned an unexpected status: ${response.status}.`,
    );
  }

  let body: IdentityTokenResponse;
  try {
    body = (await response.json()) as IdentityTokenResponse;
  } catch (cause) {
    throw new ServiceUnavailableError("Identity service returned an invalid response.", cause);
  }

  if (!body.valid || !body.user) {
    throw new UnauthorisedError(
      `Token is invalid: ${body.error ?? "unknown error"}.`,
      "TOKEN_INVALID",
    );
  }
  const parsed = identityUserSchema.safeParse(body.user);
  if (!parsed.success) {
    throw new ServiceUnavailableError("Identity service returned an invalid user payload.");
  }
  return mapIdentityUser(parsed.data as NonNullable<IdentityTokenResponse["user"]>);
}
