-- =============================================================
-- Consolidated Schema + Schema Changes (SQL root only)
-- Scope:
--   - Includes SQL files directly under SQL/
--   - Excludes SQL/migrations/core-platform/
--   - Excludes policy/RLS statements
--   - Includes schema objects and schema-altering changes
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================
-- BASE TABLES
-- =============================================================

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        TEXT UNIQUE NOT NULL,
    full_name    TEXT NOT NULL,
    phone_number TEXT,
    role         TEXT NOT NULL CHECK (role IN ('company', 'worker', 'admin')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admins (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    admin_level TEXT NOT NULL DEFAULT 'standard'
                    CHECK (admin_level IN ('standard', 'super'))
);

CREATE TABLE companies (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name  TEXT NOT NULL,
    address_line1 TEXT,
    address_line2 TEXT,
    city          TEXT,
    postcode      TEXT
);

CREATE TABLE companies_profile (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    bio        TEXT,
    logo_url   TEXT,
    website    TEXT
);

CREATE TABLE trades (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT NOT NULL UNIQUE,
    description  TEXT
);

CREATE TABLE workers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    trade_id        UUID NOT NULL REFERENCES trades(id),
    qualifications  TEXT,
    verified_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verified_status IN ('pending','verified','rejected','suspended')),
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    location_lng    NUMERIC(10,7),
    location_lat    NUMERIC(10,7),
    location        GEOGRAPHY(POINT, 4326)
);

CREATE TABLE workers_profile (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id   UUID NOT NULL UNIQUE REFERENCES workers(id) ON DELETE CASCADE,
    bio         TEXT,
    avatar_url  TEXT,
    hourly_rate NUMERIC(8,2)
);

CREATE TABLE worker_job_stats (
    worker_id             UUID PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
    last_job_completed_at TIMESTAMPTZ,
    total_jobs_completed  INT NOT NULL DEFAULT 0,
    total_rejections      INT NOT NULL DEFAULT 0,
    penalty_count         INT NOT NULL DEFAULT 0,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id     UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_url      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','expired')),
    issue_date    DATE,
    expiry_date   DATE,
    verified_at   TIMESTAMPTZ
);

CREATE TABLE worker_availability (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id             UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date                  DATE NOT NULL,
    available             BOOLEAN NOT NULL DEFAULT FALSE,
    locked                BOOLEAN NOT NULL DEFAULT FALSE,
    original_availability BOOLEAN,
    UNIQUE (worker_id, date)
);

CREATE TABLE availability_changes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('set_available','set_unavailable')),
    fee_charged NUMERIC(8,2) NOT NULL DEFAULT 0,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    trade_id             UUID NOT NULL REFERENCES trades(id),
    job_lng              NUMERIC(10,7),
    job_lat              NUMERIC(10,7),
    job_location         GEOGRAPHY(POINT, 4326),
    workers_needed       INT NOT NULL CHECK (workers_needed > 0),
    start_date           DATE NOT NULL,
    end_date             DATE NOT NULL,
    status               TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN (
                                 'draft','pending_quote','quoted','pending_payment',
                                 'paid','allocating','allocated','in_progress',
                                 'completed','cancelled'
                             )),
    description          TEXT,
    special_requirements TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE TABLE job_status_history (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes      TEXT
);

CREATE TABLE job_quotes (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id                   UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    total_workers            INT NOT NULL,
    price_per_worker_per_day NUMERIC(10,2) NOT NULL,
    num_days                 INT NOT NULL,
    total_price              NUMERIC(12,2) NOT NULL,
    currency                 TEXT NOT NULL DEFAULT 'GBP',
    status                   TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','accepted','expired','rejected')),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE allocations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    position_in_queue INT NOT NULL DEFAULT 1,
    status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','declined','timed_out','cancelled')),
    notified_at       TIMESTAMPTZ,
    responded_at      TIMESTAMPTZ,
    response_deadline TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, worker_id)
);

CREATE TABLE reviews (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reviewed_user_id  UUID NOT NULL REFERENCES users(id),
    review_company_id UUID REFERENCES companies(id),
    review_worker_id  UUID REFERENCES workers(id),
    rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (review_company_id IS NOT NULL AND review_worker_id IS NULL) OR
        (review_worker_id  IS NOT NULL AND review_company_id IS NULL)
    )
);

CREATE TABLE payment_methods (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    payment_method     TEXT,
    card_last4         CHAR(4),
    card_brand         TEXT,
    card_exp_month     SMALLINT,
    card_exp_year      SMALLINT,
    is_default         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id                   UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    amount                   NUMERIC(12,2) NOT NULL,
    commission               NUMERIC(10,2) NOT NULL DEFAULT 0,
    status                   TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','processing','succeeded','failed','refunded')),
    stripe_payment_intent_id TEXT,
    paid_at                  TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE penalty_fees (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id        UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
    fee_type         TEXT NOT NULL CHECK (fee_type IN ('job_rejection','availability_change')),
    amount           NUMERIC(8,2) NOT NULL,
    reason           TEXT,
    status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','charged','waived','disputed','refunded')),
    stripe_charge_id TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appeals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
    penalty_fees_id UUID REFERENCES penalty_fees(id) ON DELETE SET NULL,
    subject         TEXT NOT NULL,
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','under_review','approved','rejected','closed')),
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chats (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_id     UUID REFERENCES jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id        UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type   TEXT NOT NULL DEFAULT 'text'
                       CHECK (message_type IN ('text','system','ai','structured_data')),
    content        TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at    TIMESTAMPTZ
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_users_email              ON users(email);
CREATE INDEX idx_users_role               ON users(role);
CREATE INDEX idx_workers_trade            ON workers(trade_id);
CREATE INDEX idx_workers_verified         ON workers(verified_status);
CREATE INDEX idx_workers_location         ON workers USING GIST(location);
CREATE INDEX idx_jobs_company             ON jobs(company_id);
CREATE INDEX idx_jobs_trade               ON jobs(trade_id);
CREATE INDEX idx_jobs_status              ON jobs(status);
CREATE INDEX idx_jobs_dates               ON jobs(start_date, end_date);
CREATE INDEX idx_jobs_location            ON jobs USING GIST(job_location);
CREATE INDEX idx_allocations_job          ON allocations(job_id);
CREATE INDEX idx_allocations_worker       ON allocations(worker_id);
CREATE INDEX idx_allocations_status       ON allocations(status);
CREATE INDEX idx_availability_worker      ON worker_availability(worker_id);
CREATE INDEX idx_availability_date        ON worker_availability(date);
CREATE INDEX idx_availability_worker_date ON worker_availability(worker_id, date);
CREATE INDEX idx_notifications_user       ON notifications(user_id);
CREATE INDEX idx_notifications_unread     ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_penalty_worker           ON penalty_fees(worker_id);
CREATE INDEX idx_penalty_status           ON penalty_fees(status);
CREATE INDEX idx_messages_chat            ON messages(chat_id);
CREATE INDEX idx_messages_created         ON messages(created_at DESC);
CREATE INDEX idx_job_status_history_job   ON job_status_history(job_id);

-- =============================================================
-- FUNCTIONS + TRIGGERS
-- =============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_worker_job_stats_updated_at
    BEFORE UPDATE ON worker_job_stats
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_record_job_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO job_status_history(job_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_status_history
    AFTER UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION fn_record_job_status_change();

CREATE OR REPLACE FUNCTION fn_sync_worker_location()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.location_lng IS NOT NULL AND NEW.location_lat IS NOT NULL THEN
        NEW.location = ST_SetSRID(
            ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326
        )::GEOGRAPHY;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_worker_location
    BEFORE INSERT OR UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION fn_sync_worker_location();

CREATE OR REPLACE FUNCTION fn_sync_job_location()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.job_lng IS NOT NULL AND NEW.job_lat IS NOT NULL THEN
        NEW.job_location = ST_SetSRID(
            ST_MakePoint(NEW.job_lng, NEW.job_lat), 4326
        )::GEOGRAPHY;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_job_location
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION fn_sync_job_location();

CREATE OR REPLACE FUNCTION fn_protect_worker_verified_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.verified_status <> OLD.verified_status
       AND coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
    THEN
        RAISE EXCEPTION 'verified_status can only be changed by the service role';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_verified_status
    BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION fn_protect_worker_verified_status();

CREATE OR REPLACE FUNCTION fn_validate_allocation_response()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'authenticated' THEN
        IF NEW.status NOT IN ('accepted', 'declined') THEN
            RAISE EXCEPTION 'Workers may only accept or decline an allocation';
        END IF;
        IF OLD.response_deadline IS NOT NULL AND NOW() > OLD.response_deadline THEN
            RAISE EXCEPTION 'Response deadline has passed for this allocation';
        END IF;
        NEW.responded_at = NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_allocation_response
    BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION fn_validate_allocation_response();

CREATE OR REPLACE FUNCTION fn_protect_notification_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.user_id    <> OLD.user_id   OR
       NEW.type       <> OLD.type      OR
       NEW.title      <> OLD.title     OR
       NEW.body       IS DISTINCT FROM OLD.body OR
       NEW.data       IS DISTINCT FROM OLD.data OR
       NEW.created_at <> OLD.created_at
    THEN
        RAISE EXCEPTION 'Only read_at may be updated on notifications';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_notification_fields
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION fn_protect_notification_fields();

-- =============================================================
-- MIGRATION 002 SCHEMA CHANGES
-- =============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'recruiter', 'trade'));

CREATE TABLE auth_sessions (
    session_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('admin', 'recruiter', 'trade')),
    expires_at      TIMESTAMPTZ NOT NULL,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    revoked_by      TEXT CHECK (revoked_by IN ('user', 'admin', 'system')),
    ip_address      TEXT,
    user_agent_hash TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user    ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_active  ON auth_sessions(session_id)
    WHERE revoked_at IS NULL;

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    UUID        NOT NULL UNIQUE,
    request_id  TEXT        NOT NULL,
    event_name  TEXT        NOT NULL,
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    role        TEXT        CHECK (role IN ('admin', 'recruiter', 'trade')),
    ip_subnet   TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_audit_logs_occurred ON audit_logs(occurred_at DESC);
CREATE INDEX idx_audit_logs_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event    ON audit_logs(event_name);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN(metadata);

-- =============================================================
-- MIGRATION 003/004/005 + 20260314 SCHEMA CHANGES
-- =============================================================

CREATE TABLE IF NOT EXISTS company_registration_requests (
    id                                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status                              TEXT NOT NULL DEFAULT 'pending'
                                            CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    submitted_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at                         TIMESTAMPTZ,
    reviewed_by_admin_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    review_reason                       TEXT,
    requester_full_name                 TEXT NOT NULL,
    requester_email                     TEXT NOT NULL,
    requester_phone                     TEXT NOT NULL,
    requester_role_title                TEXT NOT NULL,
    company_name                        TEXT NOT NULL,
    office_address_line1                TEXT NOT NULL,
    office_address_line2                TEXT,
    office_city                         TEXT NOT NULL,
    office_postcode                     TEXT NOT NULL,
    company_website                     TEXT,
    requested_seat_count                INT NOT NULL CHECK (requested_seat_count > 0 AND requested_seat_count <= 10000),
    has_internal_approver               BOOLEAN NOT NULL DEFAULT FALSE,
    internal_approver_full_name         TEXT,
    internal_approver_email             TEXT,
    contract_signer_same_as_requester   BOOLEAN NOT NULL DEFAULT TRUE,
    contract_signer_full_name           TEXT,
    contract_signer_email               TEXT,
    source_ip_subnet                    TEXT,
    source_user_agent_hash              TEXT,
    metadata                            JSONB NOT NULL DEFAULT '{}',
    approved_user_id                    UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    approved_company_id                 UUID UNIQUE REFERENCES companies(id) ON DELETE SET NULL,
    policies_accepted_at                TIMESTAMPTZ,
    is_uk_registered                    BOOLEAN,
    company_origin_country              TEXT,
    uk_company_number                   TEXT,
    CONSTRAINT crr_internal_approver_required
        CHECK (
            has_internal_approver = FALSE
            OR (
                internal_approver_full_name IS NOT NULL
                AND internal_approver_email IS NOT NULL
            )
        ),
    CONSTRAINT crr_contract_signer_required
        CHECK (
            contract_signer_same_as_requester = TRUE
            OR (
                contract_signer_full_name IS NOT NULL
                AND contract_signer_email IS NOT NULL
            )
        ),
    CONSTRAINT crr_review_fields_match_status
        CHECK (
            (status = 'pending' AND reviewed_at IS NULL)
            OR (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
            OR status = 'withdrawn'
        )
);

CREATE INDEX IF NOT EXISTS idx_crr_status_submitted
    ON company_registration_requests(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_crr_requester_email
    ON company_registration_requests(LOWER(requester_email));

CREATE INDEX IF NOT EXISTS idx_crr_company_name
    ON company_registration_requests(LOWER(company_name));

CREATE INDEX IF NOT EXISTS idx_crr_reviewed_by_admin
    ON company_registration_requests(reviewed_by_admin_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crr_pending_requester_email
    ON company_registration_requests(LOWER(requester_email))
    WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_company_registration_requests_updated_at ON company_registration_requests;
CREATE TRIGGER trg_company_registration_requests_updated_at
    BEFORE UPDATE ON company_registration_requests
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS account_status TEXT;

ALTER TABLE companies
    ALTER COLUMN account_status SET DEFAULT 'pending';

ALTER TABLE companies
    ALTER COLUMN account_status SET NOT NULL;

ALTER TABLE companies
    DROP CONSTRAINT IF EXISTS companies_account_status_check;

ALTER TABLE companies
    ADD CONSTRAINT companies_account_status_check
    CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended'));

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status_reason TEXT,
    ADD COLUMN IF NOT EXISTS registration_request_id UUID UNIQUE REFERENCES company_registration_requests(id) ON DELETE SET NULL;

ALTER TABLE company_registration_requests
    ALTER COLUMN policies_accepted_at SET NOT NULL;

ALTER TABLE company_registration_requests
    ALTER COLUMN is_uk_registered SET NOT NULL;

ALTER TABLE company_registration_requests
  ADD COLUMN IF NOT EXISTS contract_signer_same_as_requester BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS approved_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_company_id UUID;

-- =============================================================
-- MIGRATION 006 SCHEMA CHANGES
-- =============================================================

CREATE OR REPLACE FUNCTION fn_sync_role_to_auth_metadata()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_to_auth_metadata ON users;
CREATE TRIGGER trg_sync_role_to_auth_metadata
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION fn_sync_role_to_auth_metadata();

-- =============================================================
-- MAIN SCHEMA RUNTIME RELIABILITY UPGRADES
-- =============================================================

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker ON jobs(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status_created ON jobs(company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS job_status_transitions (
    from_status TEXT NOT NULL,
    to_status   TEXT NOT NULL,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO job_status_transitions (from_status, to_status)
VALUES
    ('draft', 'pending_quote'),
    ('pending_quote', 'quoted'),
    ('quoted', 'pending_payment'),
    ('pending_payment', 'paid'),
    ('paid', 'allocating'),
    ('allocating', 'allocated'),
    ('allocated', 'in_progress'),
    ('in_progress', 'completed'),
    ('draft', 'cancelled'),
    ('pending_quote', 'cancelled'),
    ('quoted', 'cancelled'),
    ('pending_payment', 'cancelled'),
    ('paid', 'cancelled'),
    ('allocating', 'cancelled'),
    ('allocated', 'cancelled'),
    ('in_progress', 'cancelled')
ON CONFLICT (from_status, to_status) DO NOTHING;

CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key TEXT        NOT NULL,
    route           TEXT        NOT NULL,
    canonical_route TEXT        NOT NULL,
    actor_id        TEXT        NOT NULL,
    method          TEXT        NOT NULL,
    request_hash    TEXT,
    status_code     INT         NOT NULL CHECK (status_code BETWEEN 100 AND 599),
    response_body   JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (idempotency_key, canonical_route, actor_id, method)
);

ALTER TABLE idempotency_keys
    ADD COLUMN IF NOT EXISTS canonical_route TEXT,
    ADD COLUMN IF NOT EXISTS actor_id TEXT,
    ADD COLUMN IF NOT EXISTS method TEXT,
    ADD COLUMN IF NOT EXISTS request_hash TEXT;

UPDATE idempotency_keys
SET
    canonical_route = COALESCE(canonical_route, route),
    actor_id = COALESCE(actor_id, 'unknown'),
    method = COALESCE(method, 'POST')
WHERE canonical_route IS NULL OR actor_id IS NULL OR method IS NULL;

ALTER TABLE idempotency_keys
    ALTER COLUMN canonical_route SET NOT NULL,
    ALTER COLUMN actor_id SET NOT NULL,
    ALTER COLUMN method SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_route_created ON idempotency_keys(canonical_route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_actor_route_expires ON idempotency_keys(actor_id, canonical_route, expires_at);

CREATE TABLE IF NOT EXISTS outbox (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type      TEXT        NOT NULL,
    payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    event_key       TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter')),
    retry_count     INT         NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);

ALTER TABLE outbox
    ADD COLUMN IF NOT EXISTS event_key TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox(created_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_pending_next_attempt ON outbox(next_attempt_at, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_processing_created ON outbox(created_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_outbox_processed_at ON outbox(processed_at) WHERE status IN ('delivered', 'dead_letter');
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_event_key_unique ON outbox(event_key) WHERE event_key IS NOT NULL;

CREATE OR REPLACE FUNCTION transition_job_status(
    p_job_id UUID,
    p_to_status TEXT,
    p_expected_version INT,
    p_actor_id UUID,
    p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old jobs%ROWTYPE;
    v_new jobs%ROWTYPE;
    v_transition_allowed BOOLEAN;
BEGIN
    SELECT * INTO v_old FROM jobs WHERE id = p_job_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'not_found');
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM job_status_transitions t
        WHERE t.from_status = v_old.status
          AND t.to_status = p_to_status
    ) INTO v_transition_allowed;

    IF NOT v_transition_allowed THEN
        RETURN json_build_object('ok', false, 'error', 'invalid_transition');
    END IF;

    IF v_old.version <> p_expected_version THEN
        RETURN json_build_object('ok', false, 'error', 'version_conflict');
    END IF;

    UPDATE jobs
    SET
        status = p_to_status,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_job_id AND version = p_expected_version
    RETURNING * INTO v_new;

    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'version_conflict');
    END IF;

    UPDATE job_status_history
    SET changed_by = p_actor_id,
        notes = NULLIF(trim(p_reason), '')
    WHERE id = (
        SELECT id
        FROM job_status_history
        WHERE job_id = p_job_id
        ORDER BY changed_at DESC
        LIMIT 1
    );

    INSERT INTO outbox (id, event_type, payload, event_key, status, retry_count, next_attempt_at, created_at)
    VALUES (
        uuid_generate_v4(),
        'job.status.changed',
        jsonb_build_object(
            'jobId', p_job_id,
            'fromStatus', v_old.status,
            'toStatus', p_to_status,
            'actorId', p_actor_id
        ),
        format('job.status.changed:%s:%s', p_job_id::TEXT, v_new.version::TEXT),
        'pending',
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;

    RETURN json_build_object('ok', true, 'job', row_to_json(v_new));
END;
$$;

