// Express application factory for the identity service.
//
// Middleware order is critical — do not reorder without understanding the
// security implications of each decision.

import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { mfaRouter } from "./routes/mfa.js";
import { internalRouter } from "./routes/internal.js";
import { adminRouter } from "./routes/admin.js";
import { referenceRouter } from "./routes/reference.js";
import { requestIdMiddleware } from "./middleware/authenticate.js";
import { sentryErrorHandler, setupSentryExpressHandler } from "./observability/sentry.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { csrfProtection } from "./security/csrf.js";

// Parse ALLOWED_ORIGINS from comma-separated env string.
// Falls back to no origins in production (explicit allowlist required).
function buildCorsOptions(): CorsOptions {
  const raw = env.ALLOWED_ORIGINS;
  if (!raw) {
    // Deny all cross-origin in production if no origins are configured.
    if (env.NODE_ENV === "production") {
      return { origin: false };
    }
    // In dev/test, allow localhost:3000 by default.
    return { origin: "http://localhost:3000", credentials: true };
  }

  const allowed = new Set(raw.split(",").map((o) => o.trim()).filter(Boolean));

  return {
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header).
      if (!origin) return callback(null, true);
      if (allowed.has(origin)) return callback(null, true);
      callback(new Error(`Origin '${origin}' not permitted by CORS policy.`));
    },
    credentials: true,
  };
}

export const createApp = () => {
  const app = express();

  // 1. Request ID — must be first for log correlation across all middleware.
  app.use(requestIdMiddleware);

  // 2. Security headers — Helmet sets X-Frame-Options, CSP, HSTS, etc.
  app.use(helmet());

  // 3. CORS — restricted to known front-end origins from env config.
  app.use(cors(buildCorsOptions()));

  // 4. Cookie parser — needed before any middleware reads req.cookies.
  //    The secret is optional; cookies are validated by Supabase JWT, not HMAC.
  app.use(cookieParser(env.COOKIE_SECRET));

  // 5. JSON body parsing — 10kb cap prevents large-payload attacks.
  app.use(express.json({ limit: "10kb" }));

  // 6. CSRF protection — exempts OTP and internal server-to-server endpoints.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/auth/otp/")) return next();
    if (req.path === "/api/auth/recruiter-registration") return next();
    if (req.path.startsWith("/api/internal/")) return next();
    csrfProtection(req, res, next);
  });

  // 7. Routes — public first, authenticated last.
  app.use(healthRouter);

  app.use("/api/auth", authRouter);
  app.use("/api/auth/mfa", mfaRouter);
  // Admin routes — require authenticate + authorise guard inside the router.
  app.use("/api/auth/admin", adminRouter);
  app.use("/api/reference", referenceRouter);
  // Internal server-to-server endpoints — never expose to the public internet.
  app.use("/api/internal", internalRouter);

  // 8. Error handlers — Sentry must come first to capture context before response.
  setupSentryExpressHandler(app);
  app.use(sentryErrorHandler);
  app.use(globalErrorHandler);

  return app;
};

