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
import { createServiceRoleClient } from "../supabase/index.js";
import { parseOrThrow } from "../security/validators.js";
import { authLogger } from "../observability/logger.js";
import { InternalAuthError } from "../errors/index.js";

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
