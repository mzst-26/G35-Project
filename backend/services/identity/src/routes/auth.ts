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
import { refreshSession, revokeSession } from "../auth/session.service.js";
import { createRateLimiter } from "../security/index.js";
import {
  parseOrThrow,
  OtpRequestSchema,
  OtpVerifySchema,
  LogoutSchema,
} from "../security/validators.js";
import { authenticate } from "../middleware/authenticate.js";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "../security/csrf.js";
import { AuthenticationError } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Cookie option constants — shared policy for both access and refresh tokens
// ---------------------------------------------------------------------------

// Access token cookie: 15-minute lifespan, readable only by the server.
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000,
  path: "/",
};

// Refresh token cookie: 7-day lifespan, scoped to refresh endpoint only.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth/session/refresh",
};

// CSRF token cookie: NOT httpOnly — client JS reads this to set the header.
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000,
  path: "/",
};

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
    // req.user is guaranteed present after authenticate middleware.
    res.status(200).json({ user: req.user });
  },
);

