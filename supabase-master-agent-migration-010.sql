-- ============================================================================
-- MUSKY DOSE — AUTONOMOUS MASTER AGENT MIGRATION (010)
--
-- STATUS: Strictly Additive & Idempotent
-- PURPOSE:
-- Provides durable persistence for the permanent autonomous Master Agent:
-- 1. master_agent_state: Singleton state tracking autonomous mode, paused state,
--    active objective, current/next task IDs, multi-tier health, execution stats.
-- 2. master_agent_tasks: Complete lifecycle tracking for task dependency graphs,
--    worker assignments, priorities, 5-point narrative, and before/after payloads.
-- 3. master_agent_memory: Verified operational lessons, playbooks, and dependency
--    patterns with confidence scoring and sample sizes.
-- 4. master_agent_audit_log: Detailed immutable audit timeline.
-- ============================================================================

-- 1. CREATE TABLE: master_agent_state
CREATE TABLE IF NOT EXISTS public.master_agent_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  is_autonomous BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  current_objective JSONB DEFAULT NULL,
  current_task_id TEXT,
  next_task_id TEXT,
  last_run_at TIMESTAMPTZ,
  current_run_started_at TIMESTAMPTZ,
  next_scheduled_run_at TIMESTAMPTZ,
  concurrency_lock_until TIMESTAMPTZ,
  health_scores JSONB DEFAULT '{
    "seo": 92,
    "keyword": 88,
    "content": 90,
    "media": 86,
    "ux": 95,
    "performance": 94,
    "accessibility": 96,
    "production": 98
  }'::jsonb,
  stats JSONB DEFAULT '{
    "totalCycles": 0,
    "running": 0,
    "queued": 0,
    "completed": 0,
    "failed": 0,
    "blocked": 0,
    "retrying": 0
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial singleton row if not present
INSERT INTO public.master_agent_state (id, is_autonomous, is_paused)
VALUES ('singleton', true, false)
ON CONFLICT (id) DO NOTHING;

-- 2. CREATE TABLE: master_agent_tasks
CREATE TABLE IF NOT EXISTS public.master_agent_tasks (
  id TEXT PRIMARY KEY,
  objective_id TEXT,
  title TEXT NOT NULL,
  worker TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED', 'RETRYING')),
  priority INTEGER NOT NULL DEFAULT 50,
  dependency_ids TEXT[] DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  why_this_task TEXT,
  what_detected TEXT,
  what_changed TEXT,
  what_verified TEXT,
  what_learned TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_agent_tasks_status ON public.master_agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_master_agent_tasks_worker ON public.master_agent_tasks(worker);
CREATE INDEX IF NOT EXISTS idx_master_agent_tasks_created ON public.master_agent_tasks(created_at DESC);

-- 3. CREATE TABLE: master_agent_memory
CREATE TABLE IF NOT EXISTS public.master_agent_memory (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('PLAYBOOK', 'VERIFIED_LESSON', 'DEPENDENCY_PATTERN', 'ROOT_CAUSE', 'PREFERENCE', 'HEURISTIC')),
  topic TEXT NOT NULL,
  lesson TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.850,
  sample_size INTEGER NOT NULL DEFAULT 1,
  is_canonical BOOLEAN NOT NULL DEFAULT true,
  verification_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_agent_memory_topic ON public.master_agent_memory(topic);
CREATE INDEX IF NOT EXISTS idx_master_agent_memory_cat ON public.master_agent_memory(category);

-- 4. CREATE TABLE: master_agent_audit_log
CREATE TABLE IF NOT EXISTS public.master_agent_audit_log (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  objective_id TEXT,
  worker TEXT NOT NULL,
  action TEXT NOT NULL,
  files_affected TEXT[] DEFAULT '{}',
  data_affected JSONB DEFAULT '{}'::jsonb,
  result TEXT NOT NULL,
  test_outcome TEXT,
  deployment_outcome TEXT,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_agent_audit_created ON public.master_agent_audit_log(created_at DESC);

-- 5. RLS POLICIES
ALTER TABLE public.master_agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on master_agent_state" ON public.master_agent_state;
CREATE POLICY "Service role full access on master_agent_state"
ON public.master_agent_state FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on master_agent_tasks" ON public.master_agent_tasks;
CREATE POLICY "Service role full access on master_agent_tasks"
ON public.master_agent_tasks FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on master_agent_memory" ON public.master_agent_memory;
CREATE POLICY "Service role full access on master_agent_memory"
ON public.master_agent_memory FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on master_agent_audit_log" ON public.master_agent_audit_log;
CREATE POLICY "Service role full access on master_agent_audit_log"
ON public.master_agent_audit_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

