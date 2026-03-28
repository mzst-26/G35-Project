


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."find_workers_in_job_zone"("p_job_id" "uuid", "p_limit" integer DEFAULT 200) RETURNS TABLE("worker_id" "uuid", "zone_id" "uuid", "distance_m" double precision, "zone_radius_m" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    z.worker_id,
    z.id AS zone_id,
    ST_Distance(z.center_point, j.job_location) AS distance_m,
    z.radius_m AS zone_radius_m
  FROM public.jobs j
  JOIN public.worker_service_zones z
    ON z.is_active = true
   AND j.job_location IS NOT NULL
   AND ST_DWithin(z.center_point, j.job_location, z.radius_m)
  WHERE j.id = p_job_id
  ORDER BY distance_m ASC
  LIMIT GREATEST(1, LEAST(p_limit, 5000));
$$;


ALTER FUNCTION "public"."find_workers_in_job_zone"("p_job_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_protect_notification_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."fn_protect_notification_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_protect_worker_verified_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- current_setting throws if the setting doesn't exist, so use coalesce
    IF NEW.verified_status <> OLD.verified_status
       AND coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
    THEN
        RAISE EXCEPTION 'verified_status can only be changed by the service role';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_protect_worker_verified_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_record_job_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO job_status_history(job_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_record_job_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_job_location"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.job_lng IS NOT NULL AND NEW.job_lat IS NOT NULL THEN
        NEW.job_location = ST_SetSRID(
            ST_MakePoint(NEW.job_lng, NEW.job_lat), 4326
        )::GEOGRAPHY;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_job_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_job_location_from_lng_lat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.job_lng IS NOT NULL AND NEW.job_lat IS NOT NULL THEN
    NEW.job_location = ST_SetSRID(ST_MakePoint(NEW.job_lng, NEW.job_lat), 4326)::geography;
  ELSE
    NEW.job_location = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_job_location_from_lng_lat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_role_to_auth_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."fn_sync_role_to_auth_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_service_zone_location"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.center_lng IS NOT NULL AND NEW.center_lat IS NOT NULL THEN
        NEW.center_point = ST_SetSRID(
            ST_MakePoint(NEW.center_lng, NEW.center_lat), 4326
        )::GEOGRAPHY;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_service_zone_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_worker_location"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.location_lng IS NOT NULL AND NEW.location_lat IS NOT NULL THEN
        NEW.location = ST_SetSRID(
            ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326
        )::GEOGRAPHY;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_worker_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_worker_zone_center_point"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.center_point = ST_SetSRID(ST_MakePoint(NEW.center_lng, NEW.center_lat), 4326)::geography;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_worker_zone_center_point"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_validate_allocation_response"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only enforce when status is changing
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    -- Workers (authenticated role) can only set accepted or declined
    IF coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'authenticated' THEN
        IF NEW.status NOT IN ('accepted', 'declined') THEN
            RAISE EXCEPTION 'Workers may only accept or decline an allocation';
        END IF;
        -- Block response if deadline has passed
        IF OLD.response_deadline IS NOT NULL AND NOW() > OLD.response_deadline THEN
            RAISE EXCEPTION 'Response deadline has passed for this allocation';
        END IF;
        -- Record the response time
        NEW.responded_at = NOW();
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_validate_allocation_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
    SELECT id FROM public.companies WHERE user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
    SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_worker_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
    SELECT id FROM public.workers WHERE user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_worker_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_job_status"("p_job_id" "uuid", "p_to_status" "text", "p_expected_version" integer, "p_actor_id" "uuid", "p_reason" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

  INSERT INTO public.outbox (id, event_type, payload, event_key, status, retry_count, next_attempt_at, created_at)
  VALUES (
    gen_random_uuid(),
    'job.status.changed',
    jsonb_build_object(
      'jobId', p_job_id,
      'fromStatus', v_old.status,
      'toStatus', p_to_status,
      'actorId', p_actor_id
    ),
    format('job.status.changed:%s:%s', p_job_id::text, v_new.version::text),
    'pending',
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('ok', true, 'job', row_to_json(v_new));
END;
$$;


ALTER FUNCTION "public"."transition_job_status"("p_job_id" "uuid", "p_to_status" "text", "p_expected_version" integer, "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "admin_level" "text" DEFAULT 'standard'::"text" NOT NULL,
    CONSTRAINT "admins_admin_level_check" CHECK (("admin_level" = ANY (ARRAY['standard'::"text", 'super'::"text"])))
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allocations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "position_in_queue" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notified_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "response_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "allocations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'timed_out'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appeals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "penalty_fees_id" "uuid",
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "appeals_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."appeals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "worker_id" "uuid",
    "availability_id" "uuid",
    "request_id" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "user_id" "uuid",
    "role" "text",
    "ip_subnet" "text",
    "occurred_at" timestamp with time zone NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "audit_logs_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'recruiter'::"text", 'trade'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_sessions" (
    "session_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "last_active_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_by" "text",
    "ip_address" "text",
    "user_agent_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "auth_sessions_revoked_by_check" CHECK (("revoked_by" = ANY (ARRAY['user'::"text", 'admin'::"text", 'system'::"text"]))),
    CONSTRAINT "auth_sessions_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'recruiter'::"text", 'trade'::"text"])))
);


ALTER TABLE "public"."auth_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_changes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "change_type" "text" NOT NULL,
    "fee_charged" numeric(8,2) DEFAULT 0 NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "availability_changes_change_type_check" CHECK (("change_type" = ANY (ARRAY['set_available'::"text", 'set_unavailable'::"text"])))
);


ALTER TABLE "public"."availability_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_name" "text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "postcode" "text",
    "account_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "status_changed_at" timestamp with time zone,
    "status_changed_by" "uuid",
    "status_reason" "text",
    "registration_request_id" "uuid",
    CONSTRAINT "companies_account_status_check" CHECK (("account_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies_profile" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "bio" "text",
    "logo_url" "text",
    "website" "text"
);


ALTER TABLE "public"."companies_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_registration_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by_admin_user_id" "uuid",
    "review_reason" "text",
    "requester_full_name" "text" NOT NULL,
    "requester_email" "text" NOT NULL,
    "requester_phone" "text" NOT NULL,
    "requester_role_title" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "office_address_line1" "text" NOT NULL,
    "office_address_line2" "text",
    "office_city" "text" NOT NULL,
    "office_postcode" "text" NOT NULL,
    "company_website" "text",
    "requested_seat_count" integer NOT NULL,
    "has_internal_approver" boolean DEFAULT false NOT NULL,
    "internal_approver_full_name" "text",
    "internal_approver_email" "text",
    "contract_signer_same_as_requester" boolean DEFAULT true NOT NULL,
    "contract_signer_full_name" "text",
    "contract_signer_email" "text",
    "source_ip_subnet" "text",
    "source_user_agent_hash" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "approved_user_id" "uuid",
    "approved_company_id" "uuid",
    "policies_accepted_at" timestamp with time zone NOT NULL,
    "company_origin_country" "text",
    "uk_company_number" "text",
    "is_uk_registered" boolean NOT NULL,
    CONSTRAINT "company_registration_requests_requested_seat_count_check" CHECK ((("requested_seat_count" > 0) AND ("requested_seat_count" <= 10000))),
    CONSTRAINT "company_registration_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'withdrawn'::"text"]))),
    CONSTRAINT "crr_contract_signer_required" CHECK ((("contract_signer_same_as_requester" = true) OR (("contract_signer_full_name" IS NOT NULL) AND ("contract_signer_email" IS NOT NULL)))),
    CONSTRAINT "crr_internal_approver_required" CHECK ((("has_internal_approver" = false) OR (("internal_approver_full_name" IS NOT NULL) AND ("internal_approver_email" IS NOT NULL)))),
    CONSTRAINT "crr_review_fields_match_status" CHECK (((("status" = 'pending'::"text") AND ("reviewed_at" IS NULL)) OR (("status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])) AND ("reviewed_at" IS NOT NULL)) OR ("status" = 'withdrawn'::"text")))
);


ALTER TABLE "public"."company_registration_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."idempotency_keys" (
    "idempotency_key" "text" NOT NULL,
    "route" "text" NOT NULL,
    "status_code" integer NOT NULL,
    "response_body" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "canonical_route" "text" NOT NULL,
    "actor_id" "text" NOT NULL,
    "method" "text" NOT NULL,
    "request_hash" "text",
    CONSTRAINT "idempotency_keys_check" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "idempotency_keys_status_code_check" CHECK ((("status_code" >= 100) AND ("status_code" <= 599)))
);


ALTER TABLE "public"."idempotency_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_quotes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "total_workers" integer NOT NULL,
    "price_per_worker_per_day" numeric(10,2) NOT NULL,
    "num_days" integer NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'GBP'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "job_quotes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."job_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "from_status" "text",
    "to_status" "text",
    "actor_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_status_transitions" (
    "from_status" "text" NOT NULL,
    "to_status" "text" NOT NULL,
    CONSTRAINT "job_status_transitions_from_status_check" CHECK (("from_status" = ANY (ARRAY['draft'::"text", 'open'::"text", 'filled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'disputed'::"text", 'resolved'::"text"]))),
    CONSTRAINT "job_status_transitions_to_status_check" CHECK (("to_status" = ANY (ARRAY['draft'::"text", 'open'::"text", 'filled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'disputed'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."job_status_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "trade_id" "uuid" NOT NULL,
    "job_lng" numeric(10,7),
    "job_lat" numeric(10,7),
    "job_location" "extensions"."geography"(Point,4326),
    "workers_needed" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "description" "text",
    "special_requirements" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_worker_id" "uuid",
    "version" integer DEFAULT 1,
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "salary" numeric(14,2),
    "currency" "text",
    CONSTRAINT "jobs_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "jobs_lng_lat_pair_check" CHECK ((("job_lng" IS NULL) = ("job_lat" IS NULL))),
    CONSTRAINT "jobs_start_end_at_pair_check" CHECK ((("start_at" IS NULL) = ("end_at" IS NULL))),
    CONSTRAINT "jobs_workers_needed_check" CHECK (("workers_needed" > 0))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "sender_user_id" "uuid",
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'system'::"text", 'ai'::"text", 'structured_data'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "event_key" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "outbox_retry_count_check" CHECK (("retry_count" >= 0)),
    CONSTRAINT "outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'delivered'::"text", 'failed'::"text", 'dead_letter'::"text"])))
);


ALTER TABLE "public"."outbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "payment_method" "text",
    "card_last4" character(4),
    "card_brand" "text",
    "card_exp_month" smallint,
    "card_exp_year" smallint,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "commission" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."penalty_fees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "fee_type" "text" NOT NULL,
    "amount" numeric(8,2) NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "stripe_charge_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "penalty_fees_fee_type_check" CHECK (("fee_type" = ANY (ARRAY['job_rejection'::"text", 'availability_change'::"text"]))),
    CONSTRAINT "penalty_fees_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'charged'::"text", 'waived'::"text", 'disputed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."penalty_fees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "reviewed_user_id" "uuid" NOT NULL,
    "review_company_id" "uuid",
    "review_worker_id" "uuid",
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_check" CHECK (((("review_company_id" IS NOT NULL) AND ("review_worker_id" IS NULL)) OR (("review_worker_id" IS NOT NULL) AND ("review_company_id" IS NULL)))),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trades" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."trades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'recruiter'::"text", 'trade'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_availability" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "available" boolean DEFAULT false NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "original_availability" boolean,
    "version" integer DEFAULT 1 NOT NULL,
    "start_time" "text",
    "end_time" "text",
    "recurring" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "worker_availability_time_order_check" CHECK ((("start_time" IS NULL) OR ("end_time" IS NULL) OR ("start_time" < "end_time")))
);


ALTER TABLE "public"."worker_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "issue_date" "date",
    "expiry_date" "date",
    "verified_at" timestamp with time zone,
    CONSTRAINT "worker_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."worker_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_job_stats" (
    "worker_id" "uuid" NOT NULL,
    "last_job_completed_at" timestamp with time zone,
    "total_jobs_completed" integer DEFAULT 0 NOT NULL,
    "total_rejections" integer DEFAULT 0 NOT NULL,
    "penalty_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."worker_job_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_service_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "center_lng" numeric(10,7) NOT NULL,
    "center_lat" numeric(10,7) NOT NULL,
    "center_point" "extensions"."geography"(Point,4326) NOT NULL,
    "radius_m" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "worker_service_zones_center_lat_check" CHECK ((("center_lat" >= ('-90'::integer)::numeric) AND ("center_lat" <= (90)::numeric))),
    CONSTRAINT "worker_service_zones_center_lng_check" CHECK ((("center_lng" >= ('-180'::integer)::numeric) AND ("center_lng" <= (180)::numeric))),
    CONSTRAINT "worker_service_zones_radius_m_check" CHECK ((("radius_m" >= 100) AND ("radius_m" <= 100000)))
);


ALTER TABLE "public"."worker_service_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trade_id" "uuid" NOT NULL,
    "qualifications" "text",
    "verified_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "location_lng" numeric(10,7),
    "location_lat" numeric(10,7),
    "location" "extensions"."geography"(Point,4326),
    CONSTRAINT "workers_verified_status_check" CHECK (("verified_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workers_profile" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "bio" "text",
    "avatar_url" "text",
    "hourly_rate" numeric(8,2)
);


ALTER TABLE "public"."workers_profile" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_job_id_worker_id_key" UNIQUE ("job_id", "worker_id");



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appeals"
    ADD CONSTRAINT "appeals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."availability_changes"
    ADD CONSTRAINT "availability_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies_profile"
    ADD CONSTRAINT "companies_profile_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."companies_profile"
    ADD CONSTRAINT "companies_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_registration_request_id_key" UNIQUE ("registration_request_id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."company_registration_requests"
    ADD CONSTRAINT "company_registration_requests_approved_company_id_key" UNIQUE ("approved_company_id");



ALTER TABLE ONLY "public"."company_registration_requests"
    ADD CONSTRAINT "company_registration_requests_approved_user_id_key" UNIQUE ("approved_user_id");



ALTER TABLE ONLY "public"."company_registration_requests"
    ADD CONSTRAINT "company_registration_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("idempotency_key", "canonical_route", "actor_id", "method");



ALTER TABLE ONLY "public"."job_quotes"
    ADD CONSTRAINT "job_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_status_history"
    ADD CONSTRAINT "job_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_status_transitions"
    ADD CONSTRAINT "job_status_transitions_pkey" PRIMARY KEY ("from_status", "to_status");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."jobs"
    ADD CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'open'::"text", 'filled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'disputed'::"text", 'resolved'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outbox"
    ADD CONSTRAINT "outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."penalty_fees"
    ADD CONSTRAINT "penalty_fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_display_name_key" UNIQUE ("display_name");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_availability"
    ADD CONSTRAINT "worker_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_availability"
    ADD CONSTRAINT "worker_availability_worker_id_date_key" UNIQUE ("worker_id", "date");



ALTER TABLE ONLY "public"."worker_documents"
    ADD CONSTRAINT "worker_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_job_stats"
    ADD CONSTRAINT "worker_job_stats_pkey" PRIMARY KEY ("worker_id");



ALTER TABLE ONLY "public"."worker_service_zones"
    ADD CONSTRAINT "worker_service_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers_profile"
    ADD CONSTRAINT "workers_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers_profile"
    ADD CONSTRAINT "workers_profile_worker_id_key" UNIQUE ("worker_id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_allocations_job" ON "public"."allocations" USING "btree" ("job_id");



CREATE INDEX "idx_allocations_status" ON "public"."allocations" USING "btree" ("status");



CREATE INDEX "idx_allocations_worker" ON "public"."allocations" USING "btree" ("worker_id");



CREATE INDEX "idx_audit_log_actor_created" ON "public"."audit_log" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_worker_created_at" ON "public"."audit_log" USING "btree" ("worker_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_event" ON "public"."audit_logs" USING "btree" ("event_name");



CREATE INDEX "idx_audit_logs_metadata" ON "public"."audit_logs" USING "gin" ("metadata");



CREATE INDEX "idx_audit_logs_occurred" ON "public"."audit_logs" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_user_occurred" ON "public"."audit_logs" USING "btree" ("user_id", "occurred_at" DESC);



CREATE INDEX "idx_auth_sessions_active" ON "public"."auth_sessions" USING "btree" ("session_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_auth_sessions_expires" ON "public"."auth_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_auth_sessions_user" ON "public"."auth_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_auth_sessions_user_revoked" ON "public"."auth_sessions" USING "btree" ("user_id", "revoked_at") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_availability_date" ON "public"."worker_availability" USING "btree" ("date");



CREATE INDEX "idx_availability_worker" ON "public"."worker_availability" USING "btree" ("worker_id");



CREATE INDEX "idx_availability_worker_date" ON "public"."worker_availability" USING "btree" ("worker_id", "date");



CREATE INDEX "idx_crr_company_name" ON "public"."company_registration_requests" USING "btree" ("lower"("company_name"));



CREATE INDEX "idx_crr_requester_email" ON "public"."company_registration_requests" USING "btree" ("lower"("requester_email"));



CREATE INDEX "idx_crr_reviewed_by_admin" ON "public"."company_registration_requests" USING "btree" ("reviewed_by_admin_user_id");



CREATE INDEX "idx_crr_status_submitted" ON "public"."company_registration_requests" USING "btree" ("status", "submitted_at" DESC);



CREATE INDEX "idx_idempotency_keys_actor_route_expires" ON "public"."idempotency_keys" USING "btree" ("actor_id", "canonical_route", "expires_at");



CREATE INDEX "idx_idempotency_keys_expires_at" ON "public"."idempotency_keys" USING "btree" ("expires_at");



CREATE INDEX "idx_idempotency_keys_route_created" ON "public"."idempotency_keys" USING "btree" ("route", "created_at" DESC);



CREATE INDEX "idx_job_status_history_actor_id" ON "public"."job_status_history" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_job_status_history_job" ON "public"."job_status_history" USING "btree" ("job_id");



CREATE INDEX "idx_job_status_history_job_id" ON "public"."job_status_history" USING "btree" ("job_id", "created_at" DESC);



CREATE INDEX "idx_jobs_active_schedule" ON "public"."jobs" USING "btree" ("start_at", "end_at") WHERE ("status" = ANY (ARRAY['open'::"text", 'filled'::"text", 'in_progress'::"text"]));



CREATE INDEX "idx_jobs_assigned_worker" ON "public"."jobs" USING "btree" ("assigned_worker_id");



CREATE INDEX "idx_jobs_assigned_worker_status_start_at" ON "public"."jobs" USING "btree" ("assigned_worker_id", "status", "start_at") WHERE ("assigned_worker_id" IS NOT NULL);



CREATE INDEX "idx_jobs_company" ON "public"."jobs" USING "btree" ("company_id");



CREATE INDEX "idx_jobs_company_id" ON "public"."jobs" USING "btree" ("company_id");



CREATE INDEX "idx_jobs_company_status_created" ON "public"."jobs" USING "btree" ("company_id", "status", "created_at" DESC);



CREATE INDEX "idx_jobs_dates" ON "public"."jobs" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_jobs_location" ON "public"."jobs" USING "gist" ("job_location");



CREATE INDEX "idx_jobs_location_gist" ON "public"."jobs" USING "gist" ("job_location");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_jobs_status_start_at" ON "public"."jobs" USING "btree" ("status", "start_at");



CREATE INDEX "idx_jobs_trade" ON "public"."jobs" USING "btree" ("trade_id");



CREATE INDEX "idx_messages_chat" ON "public"."messages" USING "btree" ("chat_id");



CREATE INDEX "idx_messages_created" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_outbox_event_key_unique" ON "public"."outbox" USING "btree" ("event_key") WHERE ("event_key" IS NOT NULL);



CREATE INDEX "idx_outbox_pending_next_attempt" ON "public"."outbox" USING "btree" ("next_attempt_at", "created_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_outbox_processed_at" ON "public"."outbox" USING "btree" ("processed_at") WHERE ("status" = ANY (ARRAY['delivered'::"text", 'dead_letter'::"text"]));



CREATE INDEX "idx_outbox_processing_created" ON "public"."outbox" USING "btree" ("created_at") WHERE ("status" = 'processing'::"text");



CREATE INDEX "idx_outbox_unprocessed" ON "public"."outbox" USING "btree" ("created_at") WHERE ("processed_at" IS NULL);



CREATE INDEX "idx_penalty_status" ON "public"."penalty_fees" USING "btree" ("status");



CREATE INDEX "idx_penalty_worker" ON "public"."penalty_fees" USING "btree" ("worker_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_worker_availability_worker_date_version" ON "public"."worker_availability" USING "btree" ("worker_id", "date", "version");



CREATE INDEX "idx_worker_service_zones_active_worker" ON "public"."worker_service_zones" USING "btree" ("worker_id") WHERE ("is_active" = true);



CREATE INDEX "idx_worker_service_zones_area" ON "public"."worker_service_zones" USING "gist" ("center_point");



CREATE INDEX "idx_worker_service_zones_point_gist" ON "public"."worker_service_zones" USING "gist" ("center_point") WHERE ("is_active" = true);



CREATE INDEX "idx_worker_service_zones_worker_id" ON "public"."worker_service_zones" USING "btree" ("worker_id");



CREATE INDEX "idx_workers_location" ON "public"."workers" USING "gist" ("location");



CREATE INDEX "idx_workers_trade" ON "public"."workers" USING "btree" ("trade_id");



CREATE INDEX "idx_workers_verified" ON "public"."workers" USING "btree" ("verified_status");



CREATE UNIQUE INDEX "uq_crr_pending_requester_email" ON "public"."company_registration_requests" USING "btree" ("lower"("requester_email")) WHERE ("status" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "trg_chats_updated_at" BEFORE UPDATE ON "public"."chats" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_company_registration_requests_updated_at" BEFORE UPDATE ON "public"."company_registration_requests" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_job_status_history" AFTER UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_record_job_status_change"();



CREATE OR REPLACE TRIGGER "trg_jobs_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_protect_notification_fields" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."fn_protect_notification_fields"();



CREATE OR REPLACE TRIGGER "trg_protect_verified_status" BEFORE UPDATE ON "public"."workers" FOR EACH ROW EXECUTE FUNCTION "public"."fn_protect_worker_verified_status"();



CREATE OR REPLACE TRIGGER "trg_sync_job_location" BEFORE INSERT OR UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_job_location"();



CREATE OR REPLACE TRIGGER "trg_sync_job_location_from_lng_lat" BEFORE INSERT OR UPDATE OF "job_lng", "job_lat" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_job_location_from_lng_lat"();



CREATE OR REPLACE TRIGGER "trg_sync_role_to_auth_metadata" AFTER INSERT OR UPDATE OF "role" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_role_to_auth_metadata"();



CREATE OR REPLACE TRIGGER "trg_sync_service_zone_location" BEFORE INSERT OR UPDATE ON "public"."worker_service_zones" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_service_zone_location"();



CREATE OR REPLACE TRIGGER "trg_sync_worker_location" BEFORE INSERT OR UPDATE ON "public"."workers" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_worker_location"();



CREATE OR REPLACE TRIGGER "trg_sync_worker_zone_center_point" BEFORE INSERT OR UPDATE OF "center_lng", "center_lat" ON "public"."worker_service_zones" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_worker_zone_center_point"();



CREATE OR REPLACE TRIGGER "trg_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_validate_allocation_response" BEFORE UPDATE ON "public"."allocations" FOR EACH ROW EXECUTE FUNCTION "public"."fn_validate_allocation_response"();



CREATE OR REPLACE TRIGGER "trg_worker_availability_updated_at" BEFORE UPDATE ON "public"."worker_availability" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_worker_job_stats_updated_at" BEFORE UPDATE ON "public"."worker_job_stats" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_worker_service_zones_updated_at" BEFORE UPDATE ON "public"."worker_service_zones" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appeals"
    ADD CONSTRAINT "appeals_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appeals"
    ADD CONSTRAINT "appeals_penalty_fees_id_fkey" FOREIGN KEY ("penalty_fees_id") REFERENCES "public"."penalty_fees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appeals"
    ADD CONSTRAINT "appeals_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appeals"
    ADD CONSTRAINT "appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability_changes"
    ADD CONSTRAINT "availability_changes_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies_profile"
    ADD CONSTRAINT "companies_profile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_registration_request_id_fkey" FOREIGN KEY ("registration_request_id") REFERENCES "public"."company_registration_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_status_changed_by_fkey" FOREIGN KEY ("status_changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_registration_requests"
    ADD CONSTRAINT "company_registration_requests_approved_company_id_fkey" FOREIGN KEY ("approved_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_registration_requests"
    ADD CONSTRAINT "company_registration_requests_approved_user_id_fkey" FOREIGN KEY ("approved_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_registration_requests"
    ADD CONSTRAINT "company_registration_requests_reviewed_by_admin_user_id_fkey" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "fk_audit_log_actor_id" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "fk_audit_log_availability_id" FOREIGN KEY ("availability_id") REFERENCES "public"."worker_availability"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "fk_audit_log_worker_id" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "fk_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."worker_service_zones"
    ADD CONSTRAINT "fk_worker_service_zones_worker_id" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_quotes"
    ADD CONSTRAINT "job_quotes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_status_history"
    ADD CONSTRAINT "job_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_status_history"
    ADD CONSTRAINT "job_status_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."penalty_fees"
    ADD CONSTRAINT "penalty_fees_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."penalty_fees"
    ADD CONSTRAINT "penalty_fees_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_review_company_id_fkey" FOREIGN KEY ("review_company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_review_worker_id_fkey" FOREIGN KEY ("review_worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewed_user_id_fkey" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."worker_availability"
    ADD CONSTRAINT "worker_availability_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_documents"
    ADD CONSTRAINT "worker_documents_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_job_stats"
    ADD CONSTRAINT "worker_job_stats_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workers_profile"
    ADD CONSTRAINT "workers_profile_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allocations: company reads own job" ON "public"."allocations" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))));



CREATE POLICY "allocations: worker reads own" ON "public"."allocations" FOR SELECT TO "authenticated" USING (("worker_id" = "public"."get_worker_id"()));



CREATE POLICY "allocations: worker update own" ON "public"."allocations" FOR UPDATE TO "authenticated" USING (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."appeals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appeals: user reads own" ON "public"."appeals" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "appeals: user submit" ON "public"."appeals" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("status" = 'open'::"text")));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log: admins read all" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "audit_log: no client deletes" ON "public"."audit_log" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "audit_log: no client updates" ON "public"."audit_log" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "audit_log: no client writes" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs: admins read all" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "audit_logs: no client deletes" ON "public"."audit_logs" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "audit_logs: no client updates" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "audit_logs: no client updates/deletes" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "audit_logs: no client writes" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "audit_logs_service_role_only" ON "public"."audit_logs" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text")) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."auth_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_sessions: no client inserts" ON "public"."auth_sessions" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "auth_sessions: no client updates" ON "public"."auth_sessions" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "auth_sessions: user can revoke own" ON "public"."auth_sessions" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("revoked_at" IS NULL)));



CREATE POLICY "auth_sessions: user reads own" ON "public"."auth_sessions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "auth_sessions_service_role_only" ON "public"."auth_sessions" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text")) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."availability_changes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "availability_changes: worker reads own" ON "public"."availability_changes" FOR SELECT TO "authenticated" USING (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chats: company insert" ON "public"."chats" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_company_id"()));



CREATE POLICY "chats: company reads own" ON "public"."chats" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_company_id"()));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies: authenticated read all" ON "public"."companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "companies: owner delete" ON "public"."companies" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "companies: owner insert" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "companies: owner update" ON "public"."companies" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."companies_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies_profile: authenticated read all" ON "public"."companies_profile" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "companies_profile: owner insert" ON "public"."companies_profile" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_company_id"()));



CREATE POLICY "companies_profile: owner update" ON "public"."companies_profile" FOR UPDATE TO "authenticated" USING (("company_id" = "public"."get_company_id"())) WITH CHECK (("company_id" = "public"."get_company_id"()));



ALTER TABLE "public"."company_registration_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_registration_requests_service_role_only" ON "public"."company_registration_requests" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text")) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."idempotency_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "idempotency_keys: no client reads" ON "public"."idempotency_keys" FOR SELECT TO "authenticated" USING (false);



CREATE POLICY "idempotency_keys: no client writes" ON "public"."idempotency_keys" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."job_quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_quotes: company accept or reject" ON "public"."job_quotes" FOR UPDATE TO "authenticated" USING ((("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))) AND ("status" = 'pending'::"text"))) WITH CHECK (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))));



CREATE POLICY "job_quotes: company reads own" ON "public"."job_quotes" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))));



ALTER TABLE "public"."job_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_status_history: company reads own jobs" ON "public"."job_status_history" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))));



CREATE POLICY "job_status_history: worker reads allocated" ON "public"."job_status_history" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "allocations"."job_id"
   FROM "public"."allocations"
  WHERE ("allocations"."worker_id" = "public"."get_worker_id"()))));



ALTER TABLE "public"."job_status_transitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_status_transitions: authenticated read all" ON "public"."job_status_transitions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "job_status_transitions: no writes" ON "public"."job_status_transitions" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs: company insert" ON "public"."jobs" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_company_id"()));



CREATE POLICY "jobs: company reads own" ON "public"."jobs" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_company_id"()));



CREATE POLICY "jobs: company update own draft" ON "public"."jobs" FOR UPDATE TO "authenticated" USING ((("company_id" = "public"."get_company_id"()) AND ("status" = ANY (ARRAY['draft'::"text", 'pending_quote'::"text", 'quoted'::"text"])))) WITH CHECK (("company_id" = "public"."get_company_id"()));



CREATE POLICY "jobs: worker reads allocated" ON "public"."jobs" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "allocations"."job_id"
   FROM "public"."allocations"
  WHERE ("allocations"."worker_id" = "public"."get_worker_id"()))));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages: company reads own chat" ON "public"."messages" FOR SELECT TO "authenticated" USING (("chat_id" IN ( SELECT "chats"."id"
   FROM "public"."chats"
  WHERE ("chats"."company_id" = "public"."get_company_id"()))));



CREATE POLICY "messages: company sends in own chat" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("chat_id" IN ( SELECT "chats"."id"
   FROM "public"."chats"
  WHERE ("chats"."company_id" = "public"."get_company_id"()))) AND ("sender_user_id" = "auth"."uid"()) AND ("message_type" = 'text'::"text")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications: user marks read" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications: user reads own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."outbox" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outbox: no client reads" ON "public"."outbox" FOR SELECT TO "authenticated" USING (false);



CREATE POLICY "outbox: no client writes" ON "public"."outbox" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods: owner delete" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_methods: owner insert" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_methods: owner reads own" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_methods: owner update" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments: company insert" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))));



CREATE POLICY "payments: company reads own" ON "public"."payments" FOR SELECT TO "authenticated" USING (("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))));



ALTER TABLE "public"."penalty_fees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "penalty_fees: worker reads own" ON "public"."penalty_fees" FOR SELECT TO "authenticated" USING (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews: authenticated read all" ON "public"."reviews" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "reviews: company reviews worker" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_user_role"() = 'company'::"text") AND ("review_worker_id" IS NOT NULL) AND ("review_company_id" IS NULL) AND ("job_id" IN ( SELECT "jobs"."id"
   FROM "public"."jobs"
  WHERE ("jobs"."company_id" = "public"."get_company_id"()))) AND ("reviewed_user_id" IN ( SELECT "workers"."user_id"
   FROM "public"."workers"
  WHERE ("workers"."id" = "reviews"."review_worker_id")))));



CREATE POLICY "reviews: worker reviews company" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_user_role"() = 'worker'::"text") AND ("review_company_id" IS NOT NULL) AND ("review_worker_id" IS NULL) AND ("job_id" IN ( SELECT "allocations"."job_id"
   FROM "public"."allocations"
  WHERE (("allocations"."worker_id" = "public"."get_worker_id"()) AND ("allocations"."status" = 'accepted'::"text")))) AND ("reviewed_user_id" IN ( SELECT "companies"."user_id"
   FROM "public"."companies"
  WHERE ("companies"."id" = "reviews"."review_company_id")))));



ALTER TABLE "public"."trades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trades: authenticated read all" ON "public"."trades" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users: authenticated read all" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users: owner update own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = ( SELECT "users_1"."role"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"())))));



ALTER TABLE "public"."worker_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_availability: companies read" ON "public"."worker_availability" FOR SELECT TO "authenticated" USING (("public"."get_user_role"() = 'company'::"text"));



CREATE POLICY "worker_availability: worker manages own" ON "public"."worker_availability" TO "authenticated" USING (("worker_id" = "public"."get_worker_id"())) WITH CHECK (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."worker_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_documents: owner delete pending only" ON "public"."worker_documents" FOR DELETE TO "authenticated" USING ((("worker_id" = "public"."get_worker_id"()) AND ("status" = 'pending'::"text")));



CREATE POLICY "worker_documents: owner insert" ON "public"."worker_documents" FOR INSERT TO "authenticated" WITH CHECK (("worker_id" = "public"."get_worker_id"()));



CREATE POLICY "worker_documents: owner reads own" ON "public"."worker_documents" FOR SELECT TO "authenticated" USING (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."worker_job_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_job_stats: worker reads own" ON "public"."worker_job_stats" FOR SELECT TO "authenticated" USING (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."worker_service_zones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_service_zones: companies read for matching" ON "public"."worker_service_zones" FOR SELECT TO "authenticated" USING (("public"."get_user_role"() = 'company'::"text"));



CREATE POLICY "worker_service_zones: worker manages own" ON "public"."worker_service_zones" TO "authenticated" USING (("worker_id" = "public"."get_worker_id"())) WITH CHECK (("worker_id" = "public"."get_worker_id"()));



ALTER TABLE "public"."workers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workers: owner insert" ON "public"."workers" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "workers: owner update" ON "public"."workers" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "workers: read verified or own" ON "public"."workers" FOR SELECT TO "authenticated" USING ((("verified_status" = 'verified'::"text") OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."workers_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workers_profile: authenticated read all" ON "public"."workers_profile" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "workers_profile: owner insert" ON "public"."workers_profile" FOR INSERT TO "authenticated" WITH CHECK (("worker_id" = "public"."get_worker_id"()));



CREATE POLICY "workers_profile: owner update" ON "public"."workers_profile" FOR UPDATE TO "authenticated" USING (("worker_id" = "public"."get_worker_id"())) WITH CHECK (("worker_id" = "public"."get_worker_id"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."find_workers_in_job_zone"("p_job_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_workers_in_job_zone"("p_job_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_workers_in_job_zone"("p_job_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_protect_notification_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_protect_notification_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_protect_notification_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_protect_worker_verified_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_protect_worker_verified_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_protect_worker_verified_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_record_job_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_record_job_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_record_job_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_job_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_job_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_job_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_job_location_from_lng_lat"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_job_location_from_lng_lat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_job_location_from_lng_lat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_role_to_auth_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_role_to_auth_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_role_to_auth_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_service_zone_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_service_zone_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_service_zone_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_worker_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_worker_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_worker_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_worker_zone_center_point"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_worker_zone_center_point"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_worker_zone_center_point"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_validate_allocation_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_validate_allocation_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_validate_allocation_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_worker_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_worker_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_worker_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transition_job_status"("p_job_id" "uuid", "p_to_status" "text", "p_expected_version" integer, "p_actor_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."transition_job_status"("p_job_id" "uuid", "p_to_status" "text", "p_expected_version" integer, "p_actor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transition_job_status"("p_job_id" "uuid", "p_to_status" "text", "p_expected_version" integer, "p_actor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."allocations" TO "anon";
GRANT ALL ON TABLE "public"."allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."allocations" TO "service_role";



GRANT ALL ON TABLE "public"."appeals" TO "anon";
GRANT ALL ON TABLE "public"."appeals" TO "authenticated";
GRANT ALL ON TABLE "public"."appeals" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."auth_sessions" TO "anon";
GRANT ALL ON TABLE "public"."auth_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."availability_changes" TO "anon";
GRANT ALL ON TABLE "public"."availability_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_changes" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."companies_profile" TO "anon";
GRANT ALL ON TABLE "public"."companies_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."companies_profile" TO "service_role";



GRANT ALL ON TABLE "public"."company_registration_requests" TO "anon";
GRANT ALL ON TABLE "public"."company_registration_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."company_registration_requests" TO "service_role";



GRANT ALL ON TABLE "public"."idempotency_keys" TO "anon";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "service_role";



GRANT ALL ON TABLE "public"."job_quotes" TO "anon";
GRANT ALL ON TABLE "public"."job_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."job_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."job_status_history" TO "anon";
GRANT ALL ON TABLE "public"."job_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."job_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."job_status_transitions" TO "anon";
GRANT ALL ON TABLE "public"."job_status_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."job_status_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."outbox" TO "anon";
GRANT ALL ON TABLE "public"."outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."outbox" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."penalty_fees" TO "anon";
GRANT ALL ON TABLE "public"."penalty_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."penalty_fees" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."trades" TO "anon";
GRANT ALL ON TABLE "public"."trades" TO "authenticated";
GRANT ALL ON TABLE "public"."trades" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."worker_availability" TO "anon";
GRANT ALL ON TABLE "public"."worker_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_availability" TO "service_role";



GRANT ALL ON TABLE "public"."worker_documents" TO "anon";
GRANT ALL ON TABLE "public"."worker_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_documents" TO "service_role";



GRANT ALL ON TABLE "public"."worker_job_stats" TO "anon";
GRANT ALL ON TABLE "public"."worker_job_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_job_stats" TO "service_role";



GRANT ALL ON TABLE "public"."worker_service_zones" TO "anon";
GRANT ALL ON TABLE "public"."worker_service_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_service_zones" TO "service_role";



GRANT ALL ON TABLE "public"."workers" TO "anon";
GRANT ALL ON TABLE "public"."workers" TO "authenticated";
GRANT ALL ON TABLE "public"."workers" TO "service_role";



GRANT ALL ON TABLE "public"."workers_profile" TO "anon";
GRANT ALL ON TABLE "public"."workers_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."workers_profile" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







