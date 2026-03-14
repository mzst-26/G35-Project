// MFA routes — all require a valid session cookie.
//
//   POST   /api/auth/mfa/enroll              — begin TOTP enrollment
//   POST   /api/auth/mfa/challenge           — create a challenge for a verified factor
//   POST   /api/auth/mfa/verify              — verify TOTP code, upgrade session to aal2
//   DELETE /api/auth/mfa/factors/:factorId   — revoke a factor
//   GET    /api/auth/mfa/factors             — list enrolled factors

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  enrollMfaFactor,
  createMfaChallenge,
  verifyMfaChallenge,
  revokeMfaFactor,
  listMfaFactors,
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

// Access cookie options (mirrors auth.ts — must stay in sync).
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000,
  path: "/",
};

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

