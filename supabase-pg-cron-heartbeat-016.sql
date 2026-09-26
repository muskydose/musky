-- ============================================================================
-- MUSKY DOSE — AUTONOMOUS 5-MINUTE QUEUE DRAINER HEARTBEAT (MIGRATION 016)
-- Free-First Autonomous Operating System Continuous Execution
-- ============================================================================
-- Architecture:
-- 1. Uses native PostgreSQL extensions (pg_cron & pg_net) available in Supabase free tier.
-- 2. Uses Supabase Vault (vault.decrypted_secrets) to securely fetch the Authorization Bearer token.
--    NEVER exposes secrets in SQL statements, Git history, application logs, or client code.
-- 3. Invokes https://muskydose.in/api/cron/drain-queue every 5 minutes via pg_net async HTTP POST/GET.
-- 4. Preserves lane isolation (BACKGROUND & MAINTENANCE) with bounded execution windows (25s & 20s).
-- 5. Reclaims expired task leases (worker crash recovery).
-- 6. Leaves unfinished queue items durable in the database for subsequent heartbeats.
-- 7. Fallback: If pg_cron is not configured/supported, the system remains safe with Vercel daily cron
--    and reports SCHEDULER_NOT_CONFIGURED deterministically in admin telemetry without faking success.
-- ============================================================================

-- STEP 1: Enable Required Free Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- STEP 2: Configure Supabase Vault Secret (Run Once Manually by Project Owner)
-- Replace '<YOUR_INTERNAL_QUEUE_SECRET_OR_CRON_SECRET>' with your production secret.
--
-- Example execution in Supabase SQL Editor:
-- SELECT vault.create_secret(
--   '<YOUR_CRON_SECRET_VALUE>',
--   'musky_drain_secret',
--   'Bearer token for Musky Dose autonomous queue drainer heartbeat'
-- );

-- STEP 3: Define Fail-Closed Autonomous Heartbeat Stored Procedure
CREATE OR REPLACE FUNCTION autonomous_queue_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret text;
  v_url text := 'https://muskydose.in/api/cron/drain-queue';
  v_headers jsonb;
BEGIN
  -- Read secret securely from Supabase Vault (musky_drain_secret or cron_secret)
  -- If vault is not configured or secret is missing, fail closed and log warning
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name IN ('musky_drain_secret', 'cron_secret')
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[autonomous_queue_heartbeat] Supabase Vault query failed: %', SQLERRM;
      RETURN;
  END;

  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    RAISE WARNING '[autonomous_queue_heartbeat] No secret found in vault.decrypted_secrets. SCHEDULER_NOT_CONFIGURED.';
    RETURN;
  END IF;

  -- Prepare headers with bearer authorization
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || trim(v_secret),
    'User-Agent', 'MuskyDose-Supabase-pg_cron/5m-Heartbeat'
  );

  -- Dispatch asynchronous HTTP request via pg_net (bounded 60s timeout)
  PERFORM net.http_get(
    url := v_url,
    headers := v_headers,
    timeout_milliseconds := 60000
  );
END;
$$;

-- STEP 4: Register Recurring 5-Minute Cron Schedule in pg_cron
-- Idempotent: Unschedule any pre-existing job with the same name before scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'musky-autonomous-queue-heartbeat') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'musky-autonomous-queue-heartbeat';
  END IF;
END $$;

SELECT cron.schedule(
  'musky-autonomous-queue-heartbeat',
  '*/5 * * * *',
  'SELECT autonomous_queue_heartbeat();'
);

-- ============================================================================
-- VERIFICATION QUERIES:
-- 1. Check scheduled cron jobs:
--    SELECT * FROM cron.job WHERE jobname = 'musky-autonomous-queue-heartbeat';
-- 2. Check recent cron execution log:
--    SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'musky-autonomous-queue-heartbeat') ORDER BY start_time DESC LIMIT 5;
-- 3. Check outgoing pg_net HTTP requests:
--    SELECT * FROM net._http_response ORDER BY id DESC LIMIT 5;
-- ============================================================================
