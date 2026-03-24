import { createServiceRoleClient } from "@infra/shared-db";

// Shared DB factory reads credentials from process.env.
// env.ts validates these at boot before this module is imported by runtime code.
export const supabase = createServiceRoleClient();
