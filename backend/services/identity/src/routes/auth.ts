// OTP and session routes.
//
// Public (no auth required):
//   POST /otp/request       — dispatch OTP email
//   POST /otp/verify        — verify OTP, create session cookies
//
// Protected (require valid session cookie):
//   POST /session/refresh   — rotate tokens
//   POST /session/logout    — revoke session, clear cookies
//   GET  /session/me        — return verified user identity

import { Router } from "express";
import crypto from "node:crypto";
import { requestOtp, verifyOtp } from "../auth/otp.service.js";
import { submitRecruiterRegistration } from "../auth/companyRegistration.service.js";
import { decodeJwtPayload, refreshSession, revokeSession } from "../auth/session.service.js";
import { createRateLimiter } from "../security/index.js";
import {
  parseOrThrow,
  OtpRequestSchema,
  OtpVerifySchema,
  LogoutSchema,
  RecruiterRegistrationSubmitSchema,
} from "../security/validators.js";
import { authenticate } from "../middleware/authenticate.js";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "../security/csrf.js";
import { AuthenticationError } from "../errors/index.js";
import {
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  CSRF_COOKIE_OPTIONS,
} from "../security/cookies.js";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/otp/request
// ---------------------------------------------------------------------------

authRouter.post(
  "/otp/request",
  createRateLimiter("otpRequest"),
  async (req, res, next) => {
    try {
      const input = parseOrThrow(OtpRequestSchema, req.body);
      const result = await requestOtp({ email: input.email });
      res.status(200).json({ messageId: result.messageId });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/otp/verify
// ---------------------------------------------------------------------------

authRouter.post(
  "/recruiter-registration",
  createRateLimiter("recruiterRegistrationSubmit"),
  async (req, res, next) => {
    try {
      const input = parseOrThrow(RecruiterRegistrationSubmitSchema, req.body);
      const result = await submitRecruiterRegistration(input, {
        requestId: req.requestId,
        ipAddress: req.ip,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      });

      res.status(202).json({
        requestId: result.requestId,
        status: result.status,
        deduplicated: result.deduplicated,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/otp/verify",
  createRateLimiter("otpVerify"),
  async (req, res, next) => {
    try {
      const input = parseOrThrow(OtpVerifySchema, req.body);

      // Hash the user-agent so we store a fingerprint, not raw UA string.
      const userAgentHash = crypto
        .createHash("sha256")
        .update(req.headers["user-agent"] ?? "")
        .digest("hex")
        .slice(0, 16);

      const result = await verifyOtp({
        email: input.email,
        token: input.token,
        ipAddress: req.ip ?? null,
        userAgentHash,
      });

      // Admin with no TOTP factor enrolled — issue a temporary Supabase-only cookie
      // so the client can reach the MFA enrollment endpoints, then redirect to setup.
      // No platform session is created here; that happens via /mfa/complete-admin-login.
      if (result.mfaSetupRequired) {
        res.cookie("sb-access-token", result.accessToken, ACCESS_COOKIE_OPTIONS);
        res.cookie("sb-refresh-token", result.refreshToken, REFRESH_COOKIE_OPTIONS);
        res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTIONS);
        res.status(200).json({ mfaSetupRequired: true });
        return;
      }

      // Set httpOnly session cookies — client JS cannot read these.
      res.cookie("sb-access-token", result.accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie("sb-refresh-token", result.refreshToken, REFRESH_COOKIE_OPTIONS);

      // Set the non-httpOnly CSRF cookie so the client can read it for future requests.
      res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTIONS);

      res.status(200).json({
        user: result.user,
        sessionId: result.session.sessionId,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/session/refresh
// ---------------------------------------------------------------------------

authRouter.post(
  "/session/refresh",
  createRateLimiter("sessionRefresh"),
  async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.["sb-refresh-token"] as string | undefined;

      if (!refreshToken) {
        throw new AuthenticationError("Refresh token missing.", "TOKEN_MISSING");
      }

      const result = await refreshSession({ refreshToken });

      res.cookie("sb-access-token", result.accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie("sb-refresh-token", result.refreshToken, REFRESH_COOKIE_OPTIONS);
      // Clear the old CSRF token first to close the replay window, then issue a fresh one.
      res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
      res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTIONS);

      res.status(200).json({ expiresAt: result.expiresAt });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/session/logout
// ---------------------------------------------------------------------------

authRouter.post(
  "/session/logout",
  authenticate,
  async (req, res, next) => {
    try {
      const input = parseOrThrow(LogoutSchema, req.body);
      const accessToken = req.cookies?.["sb-access-token"] as string | undefined;

      await revokeSession(
        { sessionId: input.sessionId, userId: req.user!.id },
        "user",
        undefined,
        accessToken,
      );

      // Clear all session cookies.
      res.clearCookie("sb-access-token", { path: "/" });
      res.clearCookie("sb-refresh-token", { path: "/api/auth/session/refresh" });
      res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/auth/session/me
// ---------------------------------------------------------------------------

authRouter.get(
  "/session/me",
  authenticate,
  (req, res) => {
    const accessToken = req.cookies?.["sb-access-token"] as string | undefined;
    const jwtPayload = accessToken ? decodeJwtPayload(accessToken) : {};
    const sessionId = typeof jwtPayload["session_id"] === "string" ? jwtPayload["session_id"] : undefined;

    // req.user is guaranteed present after authenticate middleware.
    res.status(200).json({ user: req.user, sessionId });
  },
);

