-- Tiered admin access migration (standard vs super)
-- Goal:
-- 1) Keep strict RLS (deny-by-default unless explicitly allowed)
-- 2) Allow standard admins to access operational/support/compliance data
-- 3) Allow super admins additional access to financial data and summaries

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper authorization functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    JOIN public.users u ON u.id = a.user_id
    WHERE a.user_id = auth.uid()
      AND u.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_standard_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    JOIN public.users u ON u.id = a.user_id
    WHERE a.user_id = auth.uid()
      AND u.role = 'admin'
      AND a.admin_level IN ('standard', 'super')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    JOIN public.users u ON u.id = a.user_id
    WHERE a.user_id = auth.uid()
      AND u.role = 'admin'
      AND a.admin_level = 'super'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_standard_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- New tables: financial governance + monthly snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_financial_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_financial_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_financial_audit: super reads" ON public.admin_financial_audit;
CREATE POLICY "admin_financial_audit: super reads"
ON public.admin_financial_audit
FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "admin_financial_audit: service writes" ON public.admin_financial_audit;
CREATE POLICY "admin_financial_audit: service writes"
ON public.admin_financial_audit
FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "admin_financial_audit: no client updates" ON public.admin_financial_audit;
CREATE POLICY "admin_financial_audit: no client updates"
ON public.admin_financial_audit
FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "admin_financial_audit: no client deletes" ON public.admin_financial_audit;
CREATE POLICY "admin_financial_audit: no client deletes"
ON public.admin_financial_audit
FOR DELETE TO authenticated
USING (false);

CREATE INDEX IF NOT EXISTS idx_admin_financial_audit_admin_created
ON public.admin_financial_audit (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_financial_audit_created
ON public.admin_financial_audit (created_at DESC);

CREATE TABLE IF NOT EXISTS public.monthly_financial_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start date NOT NULL UNIQUE,
  total_revenue numeric(14,2) NOT NULL DEFAULT 0,
  total_commission numeric(14,2) NOT NULL DEFAULT 0,
  total_penalties numeric(14,2) NOT NULL DEFAULT 0,
  jobs_paid_count integer NOT NULL DEFAULT 0,
  companies_billed_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_financial_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_snapshot: super reads" ON public.monthly_financial_snapshot;
CREATE POLICY "monthly_snapshot: super reads"
ON public.monthly_financial_snapshot
FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "monthly_snapshot: service writes" ON public.monthly_financial_snapshot;
CREATE POLICY "monthly_snapshot: service writes"
ON public.monthly_financial_snapshot
FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "monthly_snapshot: service updates" ON public.monthly_financial_snapshot;
CREATE POLICY "monthly_snapshot: service updates"
ON public.monthly_financial_snapshot
FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "monthly_snapshot: no client deletes" ON public.monthly_financial_snapshot;
CREATE POLICY "monthly_snapshot: no client deletes"
ON public.monthly_financial_snapshot
FOR DELETE TO authenticated
USING (false);

CREATE INDEX IF NOT EXISTS idx_monthly_financial_snapshot_month
ON public.monthly_financial_snapshot (month_start DESC);

-- ---------------------------------------------------------------------------
-- Standard admin policies (operational/support/compliance)
-- ---------------------------------------------------------------------------

-- admins table visibility for admin tooling
DROP POLICY IF EXISTS "admins: standard reads" ON public.admins;
CREATE POLICY "admins: standard reads"
ON public.admins
FOR SELECT TO authenticated
USING (public.is_standard_admin());

-- appeals
DROP POLICY IF EXISTS "appeals: standard admin reads all" ON public.appeals;
CREATE POLICY "appeals: standard admin reads all"
ON public.appeals
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "appeals: standard admin updates status" ON public.appeals;
CREATE POLICY "appeals: standard admin updates status"
ON public.appeals
FOR UPDATE TO authenticated
USING (public.is_standard_admin())
WITH CHECK (public.is_standard_admin());

-- workers + worker profiles/documents/availability/service zones/stats
DROP POLICY IF EXISTS "workers: standard admin reads all" ON public.workers;
CREATE POLICY "workers: standard admin reads all"
ON public.workers
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "workers_profile: standard admin reads all" ON public.workers_profile;
CREATE POLICY "workers_profile: standard admin reads all"
ON public.workers_profile
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "worker_documents: standard admin reads all" ON public.worker_documents;
CREATE POLICY "worker_documents: standard admin reads all"
ON public.worker_documents
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "worker_availability: standard admin reads all" ON public.worker_availability;
CREATE POLICY "worker_availability: standard admin reads all"
ON public.worker_availability
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "worker_service_zones: standard admin reads all" ON public.worker_service_zones;
CREATE POLICY "worker_service_zones: standard admin reads all"
ON public.worker_service_zones
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "worker_job_stats: standard admin reads all" ON public.worker_job_stats;
CREATE POLICY "worker_job_stats: standard admin reads all"
ON public.worker_job_stats
FOR SELECT TO authenticated
USING (public.is_standard_admin());

-- company/recruiter side operational entities
DROP POLICY IF EXISTS "companies: standard admin reads all" ON public.companies;
CREATE POLICY "companies: standard admin reads all"
ON public.companies
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "companies_profile: standard admin reads all" ON public.companies_profile;
CREATE POLICY "companies_profile: standard admin reads all"
ON public.companies_profile
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "company_registration_requests: standard admin reads all" ON public.company_registration_requests;
CREATE POLICY "company_registration_requests: standard admin reads all"
ON public.company_registration_requests
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "jobs: standard admin reads all" ON public.jobs;
CREATE POLICY "jobs: standard admin reads all"
ON public.jobs
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "allocations: standard admin reads all" ON public.allocations;
CREATE POLICY "allocations: standard admin reads all"
ON public.allocations
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "chats: standard admin reads all" ON public.chats;
CREATE POLICY "chats: standard admin reads all"
ON public.chats
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "messages: standard admin reads all" ON public.messages;
CREATE POLICY "messages: standard admin reads all"
ON public.messages
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "notifications: standard admin reads all" ON public.notifications;
CREATE POLICY "notifications: standard admin reads all"
ON public.notifications
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "users: standard admin reads all" ON public.users;
CREATE POLICY "users: standard admin reads all"
ON public.users
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "reviews: standard admin reads all" ON public.reviews;
CREATE POLICY "reviews: standard admin reads all"
ON public.reviews
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "audit_log: standard admin reads all" ON public.audit_log;
CREATE POLICY "audit_log: standard admin reads all"
ON public.audit_log
FOR SELECT TO authenticated
USING (public.is_standard_admin());

DROP POLICY IF EXISTS "audit_logs: standard admin reads all" ON public.audit_logs;
CREATE POLICY "audit_logs: standard admin reads all"
ON public.audit_logs
FOR SELECT TO authenticated
USING (public.is_standard_admin());

-- ---------------------------------------------------------------------------
-- Super admin financial policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "payments: super admin reads all" ON public.payments;
CREATE POLICY "payments: super admin reads all"
ON public.payments
FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "payment_methods: super admin reads all" ON public.payment_methods;
CREATE POLICY "payment_methods: super admin reads all"
ON public.payment_methods
FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "penalty_fees: super admin reads all" ON public.penalty_fees;
CREATE POLICY "penalty_fees: super admin reads all"
ON public.penalty_fees
FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "job_quotes: super admin reads all" ON public.job_quotes;
CREATE POLICY "job_quotes: super admin reads all"
ON public.job_quotes
FOR SELECT TO authenticated
USING (public.is_super_admin());

-- Optional: super admin visibility into outbox for financial incident operations
DROP POLICY IF EXISTS "outbox: super admin reads all" ON public.outbox;
CREATE POLICY "outbox: super admin reads all"
ON public.outbox
FOR SELECT TO authenticated
USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Financial aggregate view (super admin only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_financial_overview_monthly AS
SELECT
  date_trunc('month', p.created_at)::date AS month_start,
  COALESCE(sum(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0)::numeric(14,2) AS gross_revenue,
  COALESCE(sum(CASE WHEN p.status = 'succeeded' THEN p.commission ELSE 0 END), 0)::numeric(14,2) AS commission_total,
  count(*) FILTER (WHERE p.status = 'succeeded') AS successful_payments,
  count(DISTINCT j.company_id) FILTER (WHERE p.status = 'succeeded') AS companies_active
FROM public.payments p
JOIN public.jobs j ON j.id = p.job_id
GROUP BY 1
ORDER BY 1 DESC;

GRANT SELECT ON public.v_financial_overview_monthly TO authenticated, service_role;

-- Views do not support RLS directly. Restrict via ownership + security-barrier wrapper function.
CREATE OR REPLACE FUNCTION public.get_financial_overview_monthly()
RETURNS TABLE (
  month_start date,
  gross_revenue numeric,
  commission_total numeric,
  successful_payments bigint,
  companies_active bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT v.month_start, v.gross_revenue, v.commission_total, v.successful_payments, v.companies_active
  FROM public.v_financial_overview_monthly v
  WHERE public.is_super_admin();
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_overview_monthly() TO authenticated, service_role;

COMMIT;
