-- =============================================================
-- Phase 4 Calendar Schema Changes
-- Run this after SQL/schema.sql
-- =============================================================

ALTER TABLE worker_availability
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS start_time TEXT,
    ADD COLUMN IF NOT EXISTS end_time TEXT,
    ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'worker_availability_time_order_check'
    ) THEN
        ALTER TABLE worker_availability
            ADD CONSTRAINT worker_availability_time_order_check
            CHECK (
                start_time IS NULL
                OR end_time IS NULL
                OR start_time < end_time
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_worker_availability_worker_date_version
    ON worker_availability(worker_id, date, version);

DROP TRIGGER IF EXISTS trg_worker_availability_updated_at ON worker_availability;
CREATE TRIGGER trg_worker_availability_updated_at
    BEFORE UPDATE ON worker_availability
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

UPDATE jobs
SET
    start_at = COALESCE(start_at, start_date::timestamptz),
    end_at = COALESCE(end_at, end_date::timestamptz)
WHERE start_at IS NULL OR end_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'jobs_start_end_at_pair_check'
    ) THEN
        ALTER TABLE jobs
            ADD CONSTRAINT jobs_start_end_at_pair_check
            CHECK ((start_at IS NULL) = (end_at IS NULL));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker_status_start_at
    ON jobs(assigned_worker_id, status, start_at)
    WHERE assigned_worker_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
    ) THEN
        CREATE TABLE audit_log (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            action        TEXT        NOT NULL,
            actor_id      UUID,
            worker_id     UUID,
            availability_id UUID,
            request_id    TEXT,
            payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_log_worker_created_at
    ON audit_log(worker_id, created_at DESC);
