-- Core Platform — jobs domain (service-role access; RLS policies added separately if needed)
-- Apply in order after enabling extensions.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  salary numeric(14, 2) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('GBP', 'USD', 'EUR')),
  status text NOT NULL CHECK (
    status IN (
      'draft',
      'open',
      'filled',
      'in_progress',
      'completed',
      'cancelled',
      'disputed',
      'resolved'
    )
  ),
  assigned_worker_id uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker ON public.jobs (assigned_worker_id);

CREATE TABLE IF NOT EXISTS public.job_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history (job_id, created_at DESC);
