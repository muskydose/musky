-- ============================================================================
-- MUSKY DOSE — AUTONOMOUS GROWTH AUTOPILOT MIGRATION (009)
--
-- STATUS: Strictly Additive & Idempotent
-- PURPOSE:
-- Provides persistent storage for the continuous autonomous growth loop:
-- 1. growth_autopilot_state: Singleton state tracking running/paused, kill switch,
--    last run, next scheduled run, concurrency locks, and cycle counters.
-- 2. growth_autopilot_actions: Full lifecycle tracking for autonomous and
--    queued actions, before/after snapshots, baselines, hypotheses, and outcomes.
-- 3. growth_autopilot_learning: Machine learning patterns (winning vs failed)
--    derived from real GSC and analytics outcomes.
--
-- GUARANTEES:
-- - Zero DROP or TRUNCATE operations
-- - RLS enabled (Public blocked, Authenticated Service Role allowed)
-- - Zero impact on legacy data
-- ============================================================================

-- 1. CREATE TABLE: growth_autopilot_state
CREATE TABLE IF NOT EXISTS public.growth_autopilot_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  is_paused BOOLEAN NOT NULL DEFAULT false,
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  next_scheduled_run_at TIMESTAMPTZ,
  last_run_duration_ms INT DEFAULT 0,
  last_run_result JSONB DEFAULT '{}'::jsonb,
  concurrency_lock_until TIMESTAMPTZ,
  total_cycles_executed INT DEFAULT 0,
  auto_actions_count INT DEFAULT 0,
  pending_approvals_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial singleton row if not present
INSERT INTO public.growth_autopilot_state (id, is_paused, kill_switch_active)
VALUES ('singleton', false, false)
ON CONFLICT (id) DO NOTHING;

-- 2. CREATE TABLE: growth_autopilot_actions
CREATE TABLE IF NOT EXISTS public.growth_autopilot_actions (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE', 'BRAND', 'PAGE')),
  entity_id TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'HIGH')),
  status TEXT NOT NULL DEFAULT 'AUTO_EXECUTED' CHECK (status IN ('AUTO_EXECUTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REVERTED', 'FAILED')),
  baseline JSONB DEFAULT '{}'::jsonb,
  hypothesis TEXT,
  action_payload JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(4, 3) DEFAULT 0.500,
  learning_category TEXT DEFAULT 'SIGNAL' CHECK (learning_category IN ('FACT', 'SIGNAL', 'INFERENCE')),
  measured_outcome JSONB DEFAULT '{}'::jsonb,
  is_rollbackable BOOLEAN DEFAULT true,
  rolled_back_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Indexes for performance & query speed
CREATE INDEX IF NOT EXISTS idx_autopilot_actions_status
ON public.growth_autopilot_actions (status);

CREATE INDEX IF NOT EXISTS idx_autopilot_actions_entity
ON public.growth_autopilot_actions (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_autopilot_actions_created
ON public.growth_autopilot_actions (created_at DESC);

-- 3. CREATE TABLE: growth_autopilot_learning
CREATE TABLE IF NOT EXISTS public.growth_autopilot_learning (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('WINNING', 'FAILED', 'NEUTRAL')),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  sample_size INT DEFAULT 1,
  success_rate NUMERIC(4, 3) DEFAULT 0.500,
  avg_impact_pct NUMERIC(6, 2) DEFAULT 0.00,
  weight_modifier NUMERIC(4, 3) DEFAULT 1.000,
  last_observed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autopilot_learning_pattern
ON public.growth_autopilot_learning (pattern_type, action_type);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.growth_autopilot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_autopilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_autopilot_learning ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on growth_autopilot_state" ON public.growth_autopilot_state;
CREATE POLICY "Service role full access on growth_autopilot_state"
ON public.growth_autopilot_state FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on growth_autopilot_actions" ON public.growth_autopilot_actions;
CREATE POLICY "Service role full access on growth_autopilot_actions"
ON public.growth_autopilot_actions FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on growth_autopilot_learning" ON public.growth_autopilot_learning;
CREATE POLICY "Service role full access on growth_autopilot_learning"
ON public.growth_autopilot_learning FOR ALL TO service_role
USING (true) WITH CHECK (true);

