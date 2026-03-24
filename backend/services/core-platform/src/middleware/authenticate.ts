import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "@infra/shared-auth";
import { UnauthorisedError } from "@infra/shared-errors";
import { logger } from "../observability/logger.js";

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = extractBearerToken(header);

  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHORISED", message: "Authentication required." } });
    return;
  }

  try {
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch {
    logger.warn({ requestId: req.requestId, tokenHint: token.slice(0, 8) }, "token verification failed");
    next(new UnauthorisedError("Authentication failed."));
  }
}
