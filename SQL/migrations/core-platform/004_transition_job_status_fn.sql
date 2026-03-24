-- Atomic transition + history + outbox (invoked via Supabase RPC from core-platform).

CREATE OR REPLACE FUNCTION public.transition_job_status(
  p_job_id uuid,
  p_to_status text,
  p_expected_version integer,
  p_actor_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.jobs%ROWTYPE;
  v_new public.jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_old.version <> p_expected_version THEN
    RETURN json_build_object('ok', false, 'error', 'version_conflict');
  END IF;

  UPDATE public.jobs
  SET
    status = p_to_status,
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_job_id AND version = p_expected_version
  RETURNING * INTO v_new;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'version_conflict');
  END IF;

  INSERT INTO public.job_status_history (id, job_id, from_status, to_status, actor_id, reason, created_at)
  VALUES (
    gen_random_uuid(),
    p_job_id,
    v_old.status,
    p_to_status,
    p_actor_id,
    NULLIF(trim(p_reason), ''),
    NOW()
  );

  INSERT INTO public.outbox (id, event_type, payload, created_at)
  VALUES (
    gen_random_uuid(),
    'job.status.changed',
    jsonb_build_object(
      'jobId', p_job_id,
      'fromStatus', v_old.status,
      'toStatus', p_to_status,
      'actorId', p_actor_id
    ),
    NOW()
  );

  RETURN json_build_object('ok', true, 'job', row_to_json(v_new));
END;
$$;
