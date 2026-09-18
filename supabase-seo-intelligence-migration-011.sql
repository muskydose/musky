-- ============================================================================
-- MUSKY DOSE — SEO INTELLIGENCE LAYER MIGRATION (011)
--
-- STATUS: Strictly Additive & Idempotent
-- PURPOSE:
-- 1. master_agent_seo_opportunities: Stores detected SEO opportunities across
--    CTR improvement, ranking strikes, declining pages/queries, content gaps,
--    internal linking, and product SEO.
-- 2. master_agent_seo_reports: Stores daily 8:00 AM IST SEO briefs.
-- ============================================================================

-- 1. CREATE TABLE: master_agent_seo_opportunities
CREATE TABLE IF NOT EXISTS public.master_agent_seo_opportunities (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  page_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6, 4) NOT NULL DEFAULT 0,
  average_position NUMERIC(5, 2) NOT NULL DEFAULT 0,
  date_range TEXT NOT NULL DEFAULT 'last_7_days',
  country TEXT NOT NULL DEFAULT 'IND',
  device TEXT NOT NULL DEFAULT 'ALL',
  opportunity_type TEXT NOT NULL,
  opportunity_score INTEGER NOT NULL DEFAULT 50,
  search_intent TEXT NOT NULL DEFAULT 'INFORMATIONAL',
  recommended_action TEXT NOT NULL,
  suggested_title TEXT,
  suggested_outline JSONB DEFAULT '[]'::jsonb,
  internal_link_targets JSONB DEFAULT '[]'::jsonb,
  related_products JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'GOOGLE_SEARCH_CONSOLE',
  task_id TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_opp_status ON public.master_agent_seo_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_seo_opp_type ON public.master_agent_seo_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_seo_opp_score ON public.master_agent_seo_opportunities(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_opp_query ON public.master_agent_seo_opportunities(query);
CREATE INDEX IF NOT EXISTS idx_seo_opp_page ON public.master_agent_seo_opportunities(page_url);
CREATE INDEX IF NOT EXISTS idx_seo_opp_detected ON public.master_agent_seo_opportunities(detected_at DESC);

-- 2. CREATE TABLE: master_agent_seo_reports
CREATE TABLE IF NOT EXISTS public.master_agent_seo_reports (
  id TEXT PRIMARY KEY,
  report_date DATE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_seo_reports_date UNIQUE (report_date)
);

CREATE INDEX IF NOT EXISTS idx_seo_reports_date ON public.master_agent_seo_reports(report_date DESC);

-- 3. ENABLE RLS
ALTER TABLE public.master_agent_seo_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_seo_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access for master_agent_seo_opportunities" ON public.master_agent_seo_opportunities;
CREATE POLICY "Service role access for master_agent_seo_opportunities"
  ON public.master_agent_seo_opportunities FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for master_agent_seo_reports" ON public.master_agent_seo_reports;
CREATE POLICY "Service role access for master_agent_seo_reports"
  ON public.master_agent_seo_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

