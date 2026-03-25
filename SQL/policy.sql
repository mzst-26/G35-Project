-- =============================================================
-- TradesFair Platform - RLS Policies v2
-- PRODUCTION READY
-- =============================================================
-- Run this AFTER tradesfair_migration_v2.sql
--
-- KEY DESIGN DECISIONS:
--   • NEW/OLD are not available in RLS — all field-level protection
--     is handled via triggers in the migration file instead.
--   • Helper functions use SECURITY DEFINER so they run as the
--     DB owner and avoid permission issues on the users table.
--   • service_role (your Node.js backend) bypasses ALL RLS.
--     Never expose this key to the frontend.
--   • Policies are split by operation (SELECT/INSERT/UPDATE/DELETE)
--     for clarity and auditability.
-- =============================================================


-- =============================================================
-- HELPER FUNCTIONS
-- Placed in the public schema — Supabase does not allow writing
-- to the auth schema. Callable as public.get_worker_id() etc.,
-- but we alias them below so policies stay readable.
-- SECURITY DEFINER = runs as DB owner, bypassing RLS on lookup.
-- STABLE = Postgres can cache the result within one query.
-- SET search_path = public, auth = prevents schema-hijack attacks.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_worker_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT id FROM public.workers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT id FROM public.companies WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;


-- =============================================================
-- DROP ALL EXISTING POLICIES (safe to re-run)
-- =============================================================

DO $$ DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;


-- =============================================================
-- TABLE: users
-- =============================================================
-- All authenticated users can read basic info (names, roles are
-- needed platform-wide). Only the owner can update their row.
-- Inserts are handled by the Supabase Auth webhook / trigger,
-- not by clients directly.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: authenticated read all"
    ON users FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "users: owner update own"
    ON users FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Prevent role escalation: users cannot change their own role
        AND role = (SELECT role FROM users WHERE id = auth.uid())
    );


-- =============================================================
-- TABLE: admins
-- =============================================================
-- Only readable by admins via service_role. No client access.

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- No policies added → zero client access. service_role bypasses RLS.


-- =============================================================
-- TABLE: companies
-- =============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies: authenticated read all"
    ON companies FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "companies: owner insert"
    ON companies FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies: owner update"
    ON companies FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies: owner delete"
    ON companies FOR DELETE TO authenticated
    USING (user_id = auth.uid());


-- =============================================================
-- TABLE: companies_profile
-- =============================================================

ALTER TABLE companies_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_profile: authenticated read all"
    ON companies_profile FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "companies_profile: owner insert"
    ON companies_profile FOR INSERT TO authenticated
    WITH CHECK (
        company_id = public.get_company_id()
    );

CREATE POLICY "companies_profile: owner update"
    ON companies_profile FOR UPDATE TO authenticated
    USING (company_id = public.get_company_id())
    WITH CHECK (company_id = public.get_company_id());


-- =============================================================
-- TABLE: trades
-- =============================================================
-- Public lookup table. No writes from clients.

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades: authenticated read all"
    ON trades FOR SELECT TO authenticated
    USING (true);


-- =============================================================
-- TABLE: workers
-- =============================================================
-- Companies see only verified workers (+ their own row always).
-- verified_status changes are blocked by trigger, not RLS.

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workers: read verified or own"
    ON workers FOR SELECT TO authenticated
    USING (
        verified_status = 'verified'
        OR user_id = auth.uid()
    );

CREATE POLICY "workers: owner insert"
    ON workers FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "workers: owner update"
    ON workers FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
-- Note: fn_protect_worker_verified_status trigger (in migration)
-- prevents verified_status from being changed via this policy.


-- =============================================================
-- TABLE: workers_profile
-- =============================================================

ALTER TABLE workers_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workers_profile: authenticated read all"
    ON workers_profile FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "workers_profile: owner insert"
    ON workers_profile FOR INSERT TO authenticated
    WITH CHECK (worker_id = public.get_worker_id());

CREATE POLICY "workers_profile: owner update"
    ON workers_profile FOR UPDATE TO authenticated
    USING (worker_id = public.get_worker_id())
    WITH CHECK (worker_id = public.get_worker_id());


-- =============================================================
-- TABLE: worker_availability
-- =============================================================

ALTER TABLE worker_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_availability: worker manages own"
    ON worker_availability FOR ALL TO authenticated
    USING (worker_id = public.get_worker_id())
    WITH CHECK (worker_id = public.get_worker_id());

CREATE POLICY "worker_availability: companies read"
    ON worker_availability FOR SELECT TO authenticated
    USING (public.get_user_role() = 'company');


-- =============================================================
-- TABLE: availability_changes
-- =============================================================
-- Audit log. Workers read only. service_role writes only.

ALTER TABLE availability_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_changes: worker reads own"
    ON availability_changes FOR SELECT TO authenticated
    USING (worker_id = public.get_worker_id());


-- =============================================================
-- TABLE: worker_documents
-- =============================================================

ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_documents: owner reads own"
    ON worker_documents FOR SELECT TO authenticated
    USING (worker_id = public.get_worker_id());

CREATE POLICY "worker_documents: owner insert"
    ON worker_documents FOR INSERT TO authenticated
    WITH CHECK (worker_id = public.get_worker_id());

CREATE POLICY "worker_documents: owner delete pending only"
    ON worker_documents FOR DELETE TO authenticated
    USING (
        worker_id = public.get_worker_id()
        AND status = 'pending'
    );


-- =============================================================
-- TABLE: worker_job_stats
-- =============================================================

ALTER TABLE worker_job_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_job_stats: worker reads own"
    ON worker_job_stats FOR SELECT TO authenticated
    USING (worker_id = public.get_worker_id());


-- =============================================================
-- TABLE: jobs
-- =============================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs: company reads own"
    ON jobs FOR SELECT TO authenticated
    USING (company_id = public.get_company_id());

CREATE POLICY "jobs: worker reads allocated"
    ON jobs FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT job_id FROM allocations
            WHERE worker_id = public.get_worker_id()
        )
    );

CREATE POLICY "jobs: company insert"
    ON jobs FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_company_id());

CREATE POLICY "jobs: company update own draft"
    ON jobs FOR UPDATE TO authenticated
    USING (
        company_id = public.get_company_id()
        -- Companies can only edit jobs that haven't been paid/allocated yet
        AND status IN ('draft', 'pending_quote', 'quoted')
    )
    WITH CHECK (company_id = public.get_company_id());
-- Status transitions beyond 'quoted' are managed by service_role only.


-- =============================================================
-- TABLE: job_status_history
-- =============================================================
-- Written only by trigger. Read-only for companies and workers.

ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_status_history: company reads own jobs"
    ON job_status_history FOR SELECT TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
    );

CREATE POLICY "job_status_history: worker reads allocated"
    ON job_status_history FOR SELECT TO authenticated
    USING (
        job_id IN (
            SELECT job_id FROM allocations WHERE worker_id = public.get_worker_id()
        )
    );


-- =============================================================
-- TABLE: job_quotes
-- =============================================================

ALTER TABLE job_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_quotes: company reads own"
    ON job_quotes FOR SELECT TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
    );

CREATE POLICY "job_quotes: company accept or reject"
    ON job_quotes FOR UPDATE TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
        AND status = 'pending'
    )
    WITH CHECK (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
    );
-- INSERT is done by service_role (pricing algorithm).


-- =============================================================
-- TABLE: allocations
-- =============================================================
-- Workers can accept/decline. Field-level protection is in the
-- fn_validate_allocation_response trigger (migration file).

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allocations: worker reads own"
    ON allocations FOR SELECT TO authenticated
    USING (worker_id = public.get_worker_id());

CREATE POLICY "allocations: worker update own"
    ON allocations FOR UPDATE TO authenticated
    USING (worker_id = public.get_worker_id());
-- The trigger fn_validate_allocation_response enforces that only
-- status=accepted/declined is allowed and deadline hasn't passed.

CREATE POLICY "allocations: company reads own job"
    ON allocations FOR SELECT TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
    );
-- INSERT/DELETE by service_role only (allocation algorithm).


-- =============================================================
-- TABLE: reviews
-- =============================================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews: authenticated read all"
    ON reviews FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "reviews: company reviews worker"
    ON reviews FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role() = 'company'
        AND review_worker_id IS NOT NULL
        AND review_company_id IS NULL
        AND job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
        AND reviewed_user_id IN (
            SELECT user_id FROM workers WHERE id = review_worker_id
        )
    );

CREATE POLICY "reviews: worker reviews company"
    ON reviews FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role() = 'worker'
        AND review_company_id IS NOT NULL
        AND review_worker_id IS NULL
        AND job_id IN (
            SELECT job_id FROM allocations
            WHERE worker_id = public.get_worker_id()
            AND status = 'accepted'
        )
        AND reviewed_user_id IN (
            SELECT user_id FROM companies WHERE id = review_company_id
        )
    );


-- =============================================================
-- TABLE: payment_methods
-- =============================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods: owner reads own"
    ON payment_methods FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "payment_methods: owner insert"
    ON payment_methods FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods: owner update"
    ON payment_methods FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods: owner delete"
    ON payment_methods FOR DELETE TO authenticated
    USING (user_id = auth.uid());


-- =============================================================
-- TABLE: payments
-- =============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: company reads own"
    ON payments FOR SELECT TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
    );

CREATE POLICY "payments: company insert"
    ON payments FOR INSERT TO authenticated
    WITH CHECK (
        job_id IN (
            SELECT id FROM jobs WHERE company_id = public.get_company_id()
        )
    );
-- Status updates (succeeded/failed/refunded) done by service_role
-- after Stripe webhook confirmation only.


-- =============================================================
-- TABLE: penalty_fees
-- =============================================================
-- Workers read only. All writes by service_role.

ALTER TABLE penalty_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "penalty_fees: worker reads own"
    ON penalty_fees FOR SELECT TO authenticated
    USING (worker_id = public.get_worker_id());


-- =============================================================
-- TABLE: appeals
-- =============================================================

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appeals: user reads own"
    ON appeals FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "appeals: user submit"
    ON appeals FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'open'
    );
-- Resolution (approved/rejected/closed) by service_role / admin only.


-- =============================================================
-- TABLE: chats
-- =============================================================

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chats: company reads own"
    ON chats FOR SELECT TO authenticated
    USING (company_id = public.get_company_id());

CREATE POLICY "chats: company insert"
    ON chats FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_company_id());


-- =============================================================
-- TABLE: messages
-- =============================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: company reads own chat"
    ON messages FOR SELECT TO authenticated
    USING (
        chat_id IN (
            SELECT id FROM chats WHERE company_id = public.get_company_id()
        )
    );

CREATE POLICY "messages: company sends in own chat"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        chat_id IN (
            SELECT id FROM chats WHERE company_id = public.get_company_id()
        )
        AND sender_user_id = auth.uid()
        AND message_type = 'text'
    );
-- AI messages (message_type = 'ai', sender_user_id IS NULL)
-- are inserted by service_role only.


-- =============================================================
-- TABLE: notifications
-- =============================================================
-- Clients can only mark as read. Field protection via trigger.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: user reads own"
    ON notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notifications: user marks read"
    ON notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
-- The trigger fn_protect_notification_fields (migration file) ensures
-- only read_at can change — all other fields are locked.


-- =============================================================
-- END OF RLS POLICIES
-- =============================================================