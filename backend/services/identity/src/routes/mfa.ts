// MFA routes — all require a valid session cookie.
//
//   POST   /api/auth/mfa/enroll                — begin TOTP enrollment
//   POST   /api/auth/mfa/challenge             — create a challenge for a verified factor
//   POST   /api/auth/mfa/verify                — verify TOTP code, upgrade session to aal2
//   POST   /api/auth/mfa/complete-admin-login  — finalise admin login after MFA enrollment
//   DELETE /api/auth/mfa/factors/:factorId     — revoke a factor
//   GET    /api/auth/mfa/factors               — list enrolled factors

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  enrollMfaFactor,
  createMfaChallenge,
  verifyMfaChallenge,
  revokeMfaFactor,
  listMfaFactors,
  hasVerifiedTotpFactor,
} from "../auth/mfa.service.js";
import { grantStepUp } from "../middleware/stepUpMfa.js";
import {
  parseOrThrow,
  MfaEnrollSchema,
  MfaChallengeSchema,
  MfaVerifySchema,
  MfaRevokeParamsSchema,
} from "../security/validators.js";
import { createRateLimiter } from "../security/index.js";
import { persistSession, buildPlatformSession } from "../auth/session.service.js";
import { AuthenticationError } from "../errors/index.js";
import { authLogger } from "../observability/logger.js";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "../security/csrf.js";
import { ACCESS_COOKIE_OPTIONS, CSRF_COOKIE_OPTIONS } from "../security/cookies.js";

export const mfaRouter = Router();

// All MFA routes require a valid session.
mfaRouter.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/enroll
// ---------------------------------------------------------------------------

mfaRouter.post("/enroll", async (req, res, next) => {
  try {
    const input = parseOrThrow(MfaEnrollSchema, req.body);
    const token = req.cookies?.["sb-access-token"] as string;
    const result = await enrollMfaFactor(token, {
      type: input.type,
      friendlyName: input.friendlyName ?? "Authenticator",
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/challenge
// ---------------------------------------------------------------------------

mfaRouter.post("/challenge", createRateLimiter("mfaChallenge"), async (req, res, next) => {
  try {
    const input = parseOrThrow(MfaChallengeSchema, req.body);
    const token = req.cookies?.["sb-access-token"] as string;
    const result = await createMfaChallenge(token, { factorId: input.factorId });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/verify
// ---------------------------------------------------------------------------

mfaRouter.post("/verify", createRateLimiter("mfaVerify"), async (req, res, next) => {
  try {
    const input = parseOrThrow(MfaVerifySchema, req.body);
    const token = req.cookies?.["sb-access-token"] as string;
    const result = await verifyMfaChallenge(token, {
      factorId: input.factorId,
      challengeId: input.challengeId,
      code: input.code,
    });
    // Seed the grace-period cache so re-challenges are skipped for 15 min
    // even if the access token is later refreshed (which resets it to aal1).
    if (req.user?.id) await grantStepUp(req.user.id);
    // Update the access token cookie with the aal2-elevated token.
    res.cookie("sb-access-token", result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.status(200).json({ verified: result.verified });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/mfa/factors/:factorId
// ---------------------------------------------------------------------------

mfaRouter.delete("/factors/:factorId", async (req, res, next) => {
  try {
    const { factorId } = parseOrThrow(MfaRevokeParamsSchema, req.params);
    const token = req.cookies?.["sb-access-token"] as string;
    const result = await revokeMfaFactor(token, { factorId });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/mfa/factors
// ---------------------------------------------------------------------------

mfaRouter.get("/factors", async (req, res, next) => {
  try {
    const token = req.cookies?.["sb-access-token"] as string;
    const factors = await listMfaFactors(token);
    res.status(200).json({ factors });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/mfa/complete-admin-login
// ---------------------------------------------------------------------------
// Called after a first-time admin completes TOTP enrollment and verification.
// At this point:
//   - The sb-access-token cookie holds a temporary Supabase JWT (aal2 after verify).
//   - No platform session exists yet in auth_sessions.
//
// This endpoint creates the platform session and issues the refresh cookie,
// completing the login that was deferred in /otp/verify.

mfaRouter.post("/complete-admin-login", createRateLimiter("completeAdminLogin"), async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role !== "admin") {
      throw new AuthenticationError("Only admin accounts use this endpoint.", "ROLE_NOT_RECOGNISED");
    }

    // Confirm the admin now has a verified TOTP factor before granting a full session.
    const hasFactor = await hasVerifiedTotpFactor(user.id);
    if (!hasFactor) {
      throw new AuthenticationError(
        "MFA enrollment is not yet complete. Verify your TOTP code first.",
        "MFA_ENROLLMENT_REQUIRED",
      );
    }

    const accessToken = req.cookies?.["sb-access-token"] as string;
    const { session: platformSession, sessionId, expiresAt } = buildPlatformSession({
      accessToken,
      userId: user.id,
      role: user.role,
      ipAddress: req.ip,
      stepUpVerified: true,
    });

    persistSession(platformSession).catch((err) => {
      authLogger.warn("complete-admin-login: persistSession failed silently", { sessionId, err });
    });

    await grantStepUp(user.id);

    res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTIONS);

    authLogger.info("complete-admin-login: platform session created after MFA enrollment", {
      userId: user.id,
      sessionId,
    });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        stepUpVerified: true,
        expiresAt,
      },
      sessionId,
    });
  } catch (err) {
    next(err);
  }
});

