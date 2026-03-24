CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  idempotency_key text NOT NULL,
  route text NOT NULL,
  status_code integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (idempotency_key, route)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON public.idempotency_keys (expires_at);
