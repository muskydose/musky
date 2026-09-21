-- ============================================================================
-- MUSKY DOSE — MIGRATION 013: SECURE ANALYTICS EVENTS RLS POLICY (CRIT-01)
-- Target: public.analytics_events
-- Nature: Idempotent RLS policy hardening
-- ============================================================================

-- 1. Ensure RLS is enabled on public.analytics_events
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly-permissive legacy policy if present
DROP POLICY IF EXISTS "Allow service role manage analytics" ON public.analytics_events;

-- 3. Recreate policy strictly targeting service_role only
CREATE POLICY "Allow service role manage analytics" ON public.analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Ensure public ingestion is strictly INSERT with CHECK (true) and no SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "Allow public event ingestion" ON public.analytics_events;
CREATE POLICY "Allow public event ingestion" ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

