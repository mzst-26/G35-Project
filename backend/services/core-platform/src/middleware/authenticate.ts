import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "@infra/shared-auth";
import { UnauthorisedError } from "@infra/shared-errors";
import { UserRole } from "@infra/shared-permissions";
import { runWithRequestContext } from "@infra/shared-observability";
import { createServiceRoleClient } from "@infra/shared-db";
import { logger } from "../observability/logger.js";

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

// Enrich the authenticated user with companyId/workerId from database.
// Identity service doesn't include these in JWT, so we resolve them here.
// If enrichment fails, we continue with the partial user - authorization will reject later if required.
async function enrichUserWithContext(userId: string, role: string, requestId: string) {
  try {
    const db = createServiceRoleClient();

    if (role === UserRole.RECRUITER) {
      // Fetch companyId for recruiters from companies table
      // maybeSingle() returns null if no match (as opposed to single() which throws)
      const { data, error } = await db
        .from("companies")
        .select("id, user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error(
          { userId, role, requestId, error: error.message },
          "company_resolution_error"
        );
        // Return empty; authorization will reject later if companyId is required
        return {};
      }

      if (!data) {
        logger.info(
          { userId, role, requestId },
          "recruiter_no_company_assigned"
        );
        // Recruiter has no company yet - this is okay during onboarding
        // Authorization will reject list ops if companyId is required
        return {};
      }

      logger.info(
        { userId, role, requestId, companyId: data.id },
        "recruiter_enriched_with_company"
      );
      return { companyId: data.id };
    }

    if (role === UserRole.TRADE) {
      // Fetch workerId for workers from workers table
      // maybeSingle() returns null if no match (as opposed to single() which throws)
      const { data, error } = await db
        .from("workers")
        .select("id, user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error(
          { userId, role, requestId, error: error.message },
          "worker_resolution_error"
        );
        // Return empty; authorization will reject later if workerId is required
        return {};
      }

      if (!data) {
        logger.warn(
          { userId, role, requestId },
          "worker_no_record_found"
        );
        // Worker has no record yet - this might be during onboarding
        // Authorization will reject ops if workerId is required
        return {};
      }

      logger.info(
        { userId, role, requestId, workerId: data.id },
        "worker_enriched_with_id"
      );
      return { workerId: data.id };
    }

    // ADMIN has no companyId/workerId requirement
    return {};
  } catch (err) {
    logger.error(
      { userId, role, error: err, requestId },
      "context_enrichment_error"
    );
    // Return empty object to allow request to continue
    // Authorization will reject later if the missing context is required
    return {};
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = extractBearerToken(header);

  if (!token) {
    next(new UnauthorisedError("Authentication required."));
    return;
  }

  try {
    const user = await verifyToken(token);

    // Enrich user with companyId/workerId from database
    let enrichedUser = user;
    // Only enrich from database if companyId/workerId are not already in the JWT
    if (!user.companyId && !user.workerId) {
      const context = await enrichUserWithContext(user.userId, user.role, req.requestId);
      enrichedUser = { ...user, ...context };
    }

    req.user = enrichedUser;
    runWithRequestContext({ requestId: req.requestId, userId: user.userId }, () => next());
  } catch (err) {
    if (err instanceof UnauthorisedError) {
      logger.warn(
          { requestId: req.requestId, tokenHint: token.slice(0, 8) },
          "token_verification_failed"
        );
      next(err);
      return;
    }
    logger.error({ requestId: req.requestId, error: err }, "authentication_error");
    next(new UnauthorisedError("Authentication failed."));
  }
}
