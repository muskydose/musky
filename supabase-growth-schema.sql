-- ============================================================
-- MUSKY DOSE — MUSKY GROWTH AI DATABASE SCHEMA & RLS POLICIES
-- ============================================================

-- 1. GROWTH MARKETS TABLE
CREATE TABLE IF NOT EXISTS growth_markets (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL DEFAULT 'India',
  state TEXT NOT NULL,
  state_code TEXT,
  district TEXT,
  district_code TEXT,
  city TEXT,
  city_code TEXT,
  pincode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for growth_markets
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'India';
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS state_code TEXT;
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS district_code TEXT;
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE growth_markets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_growth_markets_state ON growth_markets(state);
CREATE INDEX IF NOT EXISTS idx_growth_markets_district ON growth_markets(district);
CREATE INDEX IF NOT EXISTS idx_growth_markets_pincode ON growth_markets(pincode);

-- 2. GROWTH MARKET METRICS TABLE
CREATE TABLE IF NOT EXISTS growth_market_metrics (
  id TEXT PRIMARY KEY,
  market_id TEXT REFERENCES growth_markets(id) ON DELETE CASCADE,
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

-- 3. GROWTH KEYWORDS TABLE
CREATE TABLE IF NOT EXISTS growth_keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'India',
  state TEXT,
  district TEXT,
  city TEXT,
  category TEXT,
  product_id TEXT,
  search_volume INT,
  competition TEXT,
  cpc NUMERIC,
  trend TEXT,
  source_tier TEXT DEFAULT 'IMPORTED',
  source_name TEXT DEFAULT 'Manual',
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for growth_keywords
ALTER TABLE growth_keywords ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE growth_keywords ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE growth_keywords ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE growth_keywords ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE growth_keywords ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'Manual';
ALTER TABLE growth_keywords ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_growth_keywords_keyword ON growth_keywords(keyword);

-- 4. GROWTH KEYWORD SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS growth_keyword_snapshots (
  id TEXT PRIMARY KEY,
  keyword_id TEXT REFERENCES growth_keywords(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  search_volume INT,
  competition TEXT,
  cpc NUMERIC,
  source_name TEXT DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for growth_keyword_snapshots
ALTER TABLE growth_keyword_snapshots ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE growth_keyword_snapshots ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'Manual';

-- 5. GROWTH LEADS TABLE (CRM)
CREATE TABLE IF NOT EXISTS growth_leads (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  lead_type TEXT DEFAULT 'Wholesaler',
  state TEXT NOT NULL,
  district TEXT,
  city TEXT,
  pincode TEXT,
  address TEXT,
  source TEXT DEFAULT 'Manual',
  interested_products TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'New',
  priority TEXT DEFAULT 'MEDIUM',
  assigned_to TEXT,
  notes TEXT,
  next_follow_up TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for growth_leads
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'Wholesaler';
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS interested_products TEXT[] DEFAULT '{}';
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ;
ALTER TABLE growth_leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_growth_leads_status ON growth_leads(status);
CREATE INDEX IF NOT EXISTS idx_growth_leads_state ON growth_leads(state);

-- 6. GROWTH COMPETITORS TABLE
CREATE TABLE IF NOT EXISTS growth_competitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  product_categories TEXT[] DEFAULT '{}',
  positioning TEXT,
  notes TEXT,
  source_tier TEXT DEFAULT 'IMPORTED',
  source_name TEXT DEFAULT 'Manual',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. GROWTH COMPETITOR OBSERVATIONS TABLE
CREATE TABLE IF NOT EXISTS growth_competitor_observations (
  id TEXT PRIMARY KEY,
  competitor_id TEXT REFERENCES growth_competitors(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  observed_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'Manual Observation',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. GROWTH DATA SOURCES TABLE
CREATE TABLE IF NOT EXISTS growth_data_sources (
  id TEXT PRIMARY KEY,
  provider_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'Fresh',
  last_synced_at TIMESTAMPTZ,
  records_count INT DEFAULT 0,
  error_message TEXT,
  quota_status TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. GROWTH DATA SYNC LOGS TABLE
CREATE TABLE IF NOT EXISTS growth_data_sync_logs (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES growth_data_sources(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  status TEXT DEFAULT 'SUCCESS',
  records_imported INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  error_details TEXT,
  duration_ms INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 10. GROWTH RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS growth_recommendations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM',
  reason TEXT NOT NULL,
  supporting_metrics JSONB DEFAULT '[]'::jsonb,
  data_sources TEXT[] DEFAULT '{}',
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  confidence TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'New',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. GROWTH IMPORT JOBS TABLE
CREATE TABLE IF NOT EXISTS growth_import_jobs (
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

-- 12. GROWTH SETTINGS TABLE
CREATE TABLE IF NOT EXISTS growth_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  weights JSONB DEFAULT '{"sales": 30, "growth": 20, "leads": 15, "wholesale": 15, "productFit": 10, "campaignResponse": 10}'::jsonb,
  min_orders_for_score INT DEFAULT 1,
  stale_data_days INT DEFAULT 14,
  ai_enabled BOOLEAN DEFAULT true,
  min_confidence_threshold INT DEFAULT 60,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ROW LEVEL SECURITY (ADMIN / SERVICE ROLE ONLY)
ALTER TABLE growth_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_market_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_keyword_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_competitor_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_data_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_settings ENABLE ROW LEVEL SECURITY;

-- Service role policies (strictly restricted to service_role, no public/anon access)
DROP POLICY IF EXISTS "Service role access for growth_markets" ON growth_markets;
CREATE POLICY "Service role access for growth_markets" ON growth_markets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_market_metrics" ON growth_market_metrics;
CREATE POLICY "Service role access for growth_market_metrics" ON growth_market_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_keywords" ON growth_keywords;
CREATE POLICY "Service role access for growth_keywords" ON growth_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_keyword_snapshots" ON growth_keyword_snapshots;
CREATE POLICY "Service role access for growth_keyword_snapshots" ON growth_keyword_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_leads" ON growth_leads;
CREATE POLICY "Service role access for growth_leads" ON growth_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_competitors" ON growth_competitors;
CREATE POLICY "Service role access for growth_competitors" ON growth_competitors FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_competitor_observations" ON growth_competitor_observations;
CREATE POLICY "Service role access for growth_competitor_observations" ON growth_competitor_observations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_data_sources" ON growth_data_sources;
CREATE POLICY "Service role access for growth_data_sources" ON growth_data_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_data_sync_logs" ON growth_data_sync_logs;
CREATE POLICY "Service role access for growth_data_sync_logs" ON growth_data_sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_recommendations" ON growth_recommendations;
CREATE POLICY "Service role access for growth_recommendations" ON growth_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_import_jobs" ON growth_import_jobs;
CREATE POLICY "Service role access for growth_import_jobs" ON growth_import_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for growth_settings" ON growth_settings;
CREATE POLICY "Service role access for growth_settings" ON growth_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
