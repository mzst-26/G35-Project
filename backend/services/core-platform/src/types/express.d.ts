import type { AuthenticatedUser } from "@infra/shared-auth";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
