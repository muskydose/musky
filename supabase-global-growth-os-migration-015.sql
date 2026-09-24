-- ============================================================================
-- MUSKY DOSE — GLOBAL GROWTH OS SECURITY HARDENING MIGRATION (015)
--
-- PURPOSE:
-- 1. Harden already-deployed migration 014 environments.
-- 2. Remove the broad Supabase "authenticated" policy from
--    growth_query_ownership.
-- 3. Preserve service-role access used by the server-side Growth OS.
--
-- SAFETY:
-- - Forward-only and idempotent.
-- - No DROP/TRUNCATE of data or tables.
-- - No permission is granted to anonymous users.
-- - If migration 014 has not been applied yet, this migration is a safe no-op;
--   migration 014 itself is also hardened in source control.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.growth_query_ownership') IS NOT NULL THEN
    ALTER TABLE public.growth_query_ownership ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admin users full access on growth_query_ownership"
      ON public.growth_query_ownership;

    -- Ensure the intended server-side service role policy remains present.
    DROP POLICY IF EXISTS "Service role full access on growth_query_ownership"
      ON public.growth_query_ownership;

    CREATE POLICY "Service role full access on growth_query_ownership"
      ON public.growth_query_ownership
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
