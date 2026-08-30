-- ============================================================================
-- MUSKY DOSE — GROWTH SCHEMA SAFE MIGRATION 001 (HARDENED)
-- Date: 2026-08-30
-- Purpose: Align an existing Supabase Growth schema with the canonical schema.
-- Safety: Additive/idempotent. No tables or columns are dropped.
-- ============================================================================

-- 1. GROWTH LEADS (CRM)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'growth_leads'
      AND column_name = 'category' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.growth_leads ALTER COLUMN category DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'Wholesaler';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS interested_products TEXT[] DEFAULT '{}';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_leads' AND column_name='category') THEN
    UPDATE public.growth_leads SET lead_type = category WHERE category IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_leads' AND column_name='contact_person') THEN
    UPDATE public.growth_leads SET contact_name = contact_person
    WHERE contact_person IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_growth_leads_status ON public.growth_leads(status);
CREATE INDEX IF NOT EXISTS idx_growth_leads_state ON public.growth_leads(state);

-- 2. GROWTH MARKETS
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'India';
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS state_code TEXT;
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS district_code TEXT;
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.growth_markets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_growth_markets_state ON public.growth_markets(state);
CREATE INDEX IF NOT EXISTS idx_growth_markets_district ON public.growth_markets(district);
CREATE INDEX IF NOT EXISTS idx_growth_markets_pincode ON public.growth_markets(pincode);

-- 3. GROWTH MARKET METRICS
CREATE TABLE IF NOT EXISTS public.growth_market_metrics (
  id TEXT PRIMARY KEY,
  market_id TEXT REFERENCES public.growth_markets(id) ON DELETE CASCADE,
  market_name TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT,
  city TEXT,
  pincode TEXT,
  customers_count INT DEFAULT 0,
  orders_count INT DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  units_sold INT DEFAULT 0,
  aov NUMERIC DEFAULT 0,
  repeat_customers_count INT DEFAULT 0,
  wholesale_leads_count INT DEFAULT 0,
  retail_leads_count INT DEFAULT 0,
  artist_leads_count INT DEFAULT 0,
  campaign_orders_count INT DEFAULT 0,
  campaign_revenue NUMERIC DEFAULT 0,
  product_demand_score NUMERIC DEFAULT 0,
  market_opportunity_score NUMERIC DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  source_tier TEXT DEFAULT 'DERIVED',
  source_name TEXT DEFAULT 'FirstParty',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GROWTH KEYWORDS & SNAPSHOTS
ALTER TABLE public.growth_keywords ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.growth_keywords ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.growth_keywords ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.growth_keywords ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE public.growth_keywords ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'Manual';
ALTER TABLE public.growth_keywords ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_keywords' AND column_name='data_source') THEN
    UPDATE public.growth_keywords SET source_name = data_source
    WHERE data_source IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_growth_keywords_keyword ON public.growth_keywords(keyword);

ALTER TABLE public.growth_keyword_snapshots ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE public.growth_keyword_snapshots ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'Manual';

-- 5. GROWTH COMPETITORS & OBSERVATIONS
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS product_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS positioning TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS source_tier TEXT DEFAULT 'IMPORTED';
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'Manual';
ALTER TABLE public.growth_competitors ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS competitor_name TEXT;
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS observed_price NUMERIC;
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS observation_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual Observation';
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.growth_competitor_observations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_competitor_observations' AND column_name='observed_at') THEN
    UPDATE public.growth_competitor_observations
    SET created_at = observed_at
    WHERE observed_at IS NOT NULL;
  END IF;
END $$;

-- 6. GROWTH DATA SOURCES & SYNC LOGS
ALTER TABLE public.growth_data_sources ADD COLUMN IF NOT EXISTS provider_key TEXT;
ALTER TABLE public.growth_data_sources ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE public.growth_data_sources ADD COLUMN IF NOT EXISTS records_count INT DEFAULT 0;
ALTER TABLE public.growth_data_sources ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.growth_data_sources ADD COLUMN IF NOT EXISTS quota_status TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_data_sources' AND column_name='last_sync_at') THEN
    UPDATE public.growth_data_sources SET last_synced_at = last_sync_at
    WHERE last_sync_at IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.growth_data_sync_logs (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES public.growth_data_sources(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  status TEXT DEFAULT 'SUCCESS',
  records_imported INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  error_details TEXT,
  duration_ms INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 7. GROWTH RECOMMENDATIONS
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM';
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS supporting_metrics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS recommended_actions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.growth_recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_recommendations' AND column_name='explanation') THEN
    UPDATE public.growth_recommendations SET reason = explanation
    WHERE explanation IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_recommendations' AND column_name='action_plan') THEN
    UPDATE public.growth_recommendations SET recommended_actions = action_plan
    WHERE action_plan IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='growth_recommendations' AND column_name='created_at') THEN
    UPDATE public.growth_recommendations SET generated_at = created_at
    WHERE created_at IS NOT NULL;
  END IF;
END $$;

-- 8. GROWTH IMPORT JOBS & SETTINGS
CREATE TABLE IF NOT EXISTS public.growth_import_jobs (
  id TEXT PRIMARY KEY,
  import_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  total_rows INT DEFAULT 0,
  imported_rows INT DEFAULT 0,
  skipped_rows INT DEFAULT 0,
  error_count INT DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.growth_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  weights JSONB DEFAULT '{"sales": 30, "growth": 20, "leads": 15, "wholesale": 15, "productFit": 10, "campaignResponse": 10}'::jsonb,
  min_orders_for_score INT DEFAULT 1,
  stale_data_days INT DEFAULT 14,
  ai_enabled BOOLEAN DEFAULT true,
  min_confidence_threshold INT DEFAULT 60,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RLS — SERVICE ROLE ONLY
ALTER TABLE public.growth_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_market_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_keyword_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_competitor_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_data_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'growth_markets','growth_market_metrics','growth_keywords','growth_keyword_snapshots',
    'growth_leads','growth_competitors','growth_competitor_observations','growth_data_sources',
    'growth_data_sync_logs','growth_recommendations','growth_import_jobs','growth_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Service role access for ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'Service role access for ' || t,
      t
    );
  END LOOP;
END $$;

-- Migration intentionally preserves all legacy columns. They may be removed only
-- in a separately reviewed cleanup after production data verification.
