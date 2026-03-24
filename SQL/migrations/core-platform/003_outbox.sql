CREATE TABLE IF NOT EXISTS public.outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON public.outbox (created_at) WHERE processed_at IS NULL;
