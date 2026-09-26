-- ============================================================================
-- MUSKY DOSE — AUTONOMOUS QUEUE LANE PERSISTENCE (MIGRATION 017)
-- Backward-compatible, idempotent addition of execution lane persistence
-- ============================================================================
-- PURPOSE:
-- 1. Ensure public.master_agent_tasks has durable 'lane' column (FAST, BACKGROUND, MAINTENANCE).
-- 2. Backfill existing legacy rows where lane is NULL to 'BACKGROUND'.
-- 3. Add CHECK constraint guaranteeing only valid execution lanes.
-- 4. Add composite index for high-throughput atomic leasing: (status, lane, priority DESC, created_at ASC).
-- 5. Preserve strict service-role-only RLS security policies.
-- ============================================================================

-- Step 1: Add lane column if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_agent_tasks'
      AND column_name = 'lane'
  ) THEN
    ALTER TABLE public.master_agent_tasks
    ADD COLUMN lane TEXT NOT NULL DEFAULT 'BACKGROUND';
  END IF;
END $$;

-- Step 2: Backfill any existing rows with NULL or empty lane to 'BACKGROUND'
UPDATE public.master_agent_tasks
SET lane = 'BACKGROUND'
WHERE lane IS NULL OR trim(lane) = '';

-- Step 3: Enforce CHECK constraint on valid lane values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_master_agent_tasks_lane'
  ) THEN
    ALTER TABLE public.master_agent_tasks
    ADD CONSTRAINT chk_master_agent_tasks_lane
    CHECK (lane IN ('FAST', 'BACKGROUND', 'MAINTENANCE'));
  END IF;
END $$;

-- Step 4: Index optimized for queue leasing and lane-isolated dispatching:
-- Enables instant queries like:
-- SELECT * FROM master_agent_tasks WHERE status IN ('QUEUED', 'RETRYING') AND lane = 'MAINTENANCE' ORDER BY priority DESC, created_at ASC;
CREATE INDEX IF NOT EXISTS idx_master_agent_tasks_lane_lease
ON public.master_agent_tasks (status, lane, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_master_agent_tasks_lane
ON public.master_agent_tasks (lane);

-- Step 5: Verify RLS is enabled and strictly restricted to service-role
ALTER TABLE public.master_agent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on master_agent_tasks" ON public.master_agent_tasks;
CREATE POLICY "Service role full access on master_agent_tasks"
ON public.master_agent_tasks FOR ALL TO service_role
USING (true) WITH CHECK (true);
