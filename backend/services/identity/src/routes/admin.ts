// Admin-only routes for user management and session revocation.
//
// Protected by authenticate + authorise guards — never accessible by regular users.
// Used by internal admin tooling and other microservices via the admin panel.
//
// Routes:
//   POST /api/auth/admin/revoke    — bulk-revoke all sessions for a user
//   POST /api/auth/admin/users     — provision a new user account

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import { revokeSession } from "../auth/session.service.js";
import {
  decideRecruiterRegistration,
  getRecruiterRegistrationRequest,
  listRecruiterRegistrationRequests,
} from "../auth/companyRegistration.service.js";
import { createServiceRoleClient } from "../supabase/index.js";
import { createRateLimiter } from "../security/rateLimit.js";
import { parseOrThrow } from "../security/validators.js";
import {
  AdminRegistrationDecisionSchema,
  AdminRegistrationListQuerySchema,
  AdminRegistrationRequestIdParamsSchema,
} from "../security/validators.js";
import { authLogger } from "../observability/logger.js";
import { InternalAuthError, ValidationError } from "../errors/index.js";

export const adminRouter = Router();

const AdminRevokeSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID."),
});

const AdminProvisionSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .email("Must be a valid email address.")
    .toLowerCase()
    .trim(),
  role: z.enum(["admin", "recruiter", "trade"], {
    required_error: "Role is required.",
    invalid_type_error: "Role must be one of: admin, recruiter, trade.",
  }),
});

// POST /api/auth/admin/revoke
// Bulk-revokes all active sessions for a user (ban, force-logout).
// Called by admin tooling when a user is suspended or banned.
adminRouter.post(
  "/revoke",
  authenticate,
  authorise("users:ban"),
  async (req, res, next) => {
    try {
      const { userId } = parseOrThrow(AdminRevokeSchema, req.body);
      await revokeSession({ userId }, "admin", "admin_action");
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/admin/users
// Provisions a new pre-confirmed user with the given email and role.
// Required because OTP flow has shouldCreateUser=false — users must be provisioned first.
adminRouter.post(
  "/users",
  authenticate,
  authorise("users:create"),
  async (req, res, next) => {
    try {
      const { email, role } = parseOrThrow(AdminProvisionSchema, req.body);
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        app_metadata: { role },
        // Skip email confirmation — admin-provisioned accounts are pre-verified.
        email_confirm: true,
      });

      if (error || !data.user) {
        authLogger.warn("admin: createUser failed", { error: error?.message });
        throw new InternalAuthError(error ? new Error(error.message) : undefined);
      }

      res.status(201).json({
        userId: data.user.id,
        email: data.user.email,
        role,
      });
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.get(
  "/registration-requests",
  authenticate,
  authorise("applications:read"),
  async (req, res, next) => {
    try {
      if (req.user?.role !== "admin") {
        res.status(403).json({ code: "FORBIDDEN", message: "Admin role required." });
        return;
      }

      const queryResult = AdminRegistrationListQuerySchema.safeParse(
        {
          status: typeof req.query.status === "string" ? req.query.status : undefined,
          limit: typeof req.query.limit === "string" ? req.query.limit : undefined,
          offset: typeof req.query.offset === "string" ? req.query.offset : undefined,
        },
      );

      if (!queryResult.success) {
        throw new ValidationError(
          "Request validation failed.",
          queryResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        );
      }

      const query = queryResult.data;

      const result = await listRecruiterRegistrationRequests({
        status: query.status,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.get(
  "/registration-requests/:requestId",
  authenticate,
  authorise("applications:read"),
  async (req, res, next) => {
    try {
      if (req.user?.role !== "admin") {
        res.status(403).json({ code: "FORBIDDEN", message: "Admin role required." });
        return;
      }

      const { requestId } = parseOrThrow(AdminRegistrationRequestIdParamsSchema, req.params);
      const record = await getRecruiterRegistrationRequest(requestId);

      if (!record) {
        res.status(404).json({ code: "NOT_FOUND", message: "Registration request not found." });
        return;
      }

      res.status(200).json(record);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.post(
  "/registration-requests/:requestId/decision",
  createRateLimiter("adminDecision"),
  authenticate,
  authorise({ any: ["applications:approve", "applications:reject"] }),
  async (req, res, next) => {
    try {
      if (req.user?.role !== "admin") {
        res.status(403).json({ code: "FORBIDDEN", message: "Admin role required." });
        return;
      }

      const { requestId } = parseOrThrow(AdminRegistrationRequestIdParamsSchema, req.params);
      const input = parseOrThrow(AdminRegistrationDecisionSchema, req.body);

      const decision = await decideRecruiterRegistration({
        requestId,
        decision: input.decision,
        reason: input.reason,
        adminUserId: req.user.id,
      });

      authLogger.info("registration request reviewed", {
        requestId: req.requestId,
        actorId: req.user.id,
        decisionId: decision.id,
        outcome: decision.status,
      });

      res.status(200).json(decision);
    } catch (err) {
      next(err);
    }
  },
);
