-- ============================================================================
-- MUSKY DOSE — WEBSITE GUARDIAN DATABASE SCHEMA (ADDITIVE & IDEMPOTENT)
-- Purpose: Durable state persistence for Guardian runs, incidents, and heartbeats.
-- Safety: Additive only. Does not drop or mutate existing business tables.
-- ============================================================================

-- 1. GUARDIAN HEARTBEATS TABLE (Durable Heartbeat & Mutual-Exclusion Lock)
CREATE TABLE IF NOT EXISTS public.guardian_heartbeats (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  run_id TEXT,
  status TEXT DEFAULT 'GUARDIAN_ALIVE',
  last_started_at TIMESTAMPTZ DEFAULT NOW(),
  last_completed_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  duration_ms INTEGER DEFAULT 0,
  checks_total INTEGER DEFAULT 0,
  checks_failed INTEGER DEFAULT 0,
  recoveries_attempted INTEGER DEFAULT 0,
  consecutive_missed INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial primary heartbeat row if not present
INSERT INTO public.guardian_heartbeats (id, status, last_started_at)
VALUES ('primary', 'GUARDIAN_ALIVE', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. GUARDIAN RUNS TABLE (Execution History & Telemetry Snapshots)
CREATE TABLE IF NOT EXISTS public.guardian_runs (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  checks_total INTEGER DEFAULT 0,
  checks_passed INTEGER DEFAULT 0,
  checks_warned INTEGER DEFAULT 0,
  checks_failed INTEGER DEFAULT 0,
  db_status TEXT,
  layered_health JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_runs_started ON public.guardian_runs(started_at DESC);

-- 3. GUARDIAN INCIDENTS TABLE (Durable Incident Tracking & Auto-Recovery History)
CREATE TABLE IF NOT EXISTS public.guardian_incidents (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  check_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  consecutive_failures INTEGER DEFAULT 1,
  recovery_attempts_count INTEGER DEFAULT 0,
  error_summary TEXT,
  attempted_recovery_action TEXT,
  recovery_result TEXT,
  first_observed_at TIMESTAMPTZ NOT NULL,
  last_observed_at TIMESTAMPTZ NOT NULL,
  recovered_at TIMESTAMPTZ,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_incidents_target ON public.guardian_incidents(target);
CREATE INDEX IF NOT EXISTS idx_guardian_incidents_status ON public.guardian_incidents(status);
CREATE INDEX IF NOT EXISTS idx_guardian_incidents_observed ON public.guardian_incidents(last_observed_at DESC);

-- Enable Row Level Security (RLS) on Guardian Tables
ALTER TABLE public.guardian_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_incidents ENABLE ROW LEVEL SECURITY;

-- Allow Service Role full access to Guardian tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guardian_heartbeats' AND policyname = 'Allow service role on guardian_heartbeats'
  ) THEN
    CREATE POLICY "Allow service role on guardian_heartbeats" ON public.guardian_heartbeats FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guardian_runs' AND policyname = 'Allow service role on guardian_runs'
  ) THEN
    CREATE POLICY "Allow service role on guardian_runs" ON public.guardian_runs FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guardian_incidents' AND policyname = 'Allow service role on guardian_incidents'
  ) THEN
    CREATE POLICY "Allow service role on guardian_incidents" ON public.guardian_incidents FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

