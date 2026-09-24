-- ============================================================================
-- MUSKY DOSE — MUSKY GLOBAL GROWTH OS MIGRATION (014)
--
-- STATUS: Strictly Additive & Idempotent
-- PURPOSE:
-- Strengthens storage for:
-- 1. Extended B2B Lead CRM fields (company, website, country, region, qualification, CRM stages)
-- 2. Query Ownership & Cannibalization tracking
-- 3. Lead Attribution (Query -> Landing Page -> Product -> Lead -> Order)
--
-- GUARANTEES:
-- - Zero DROP or TRUNCATE operations
-- - RLS enabled (Public blocked, Authenticated Admin and Service Role allowed)
-- - Zero impact on existing commerce, auth, or media data
-- ============================================================================

-- 1. EXTEND TABLE: growth_leads with Global Lead CRM & Attribution Fields
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'Wholesaler';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS public_business_info TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS product_relevance TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'QUALIFIED';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT 'WhatsApp';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS duplicate_key TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS crm_stage TEXT DEFAULT 'NEW';
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS attribution_query TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS attribution_landing_page TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS attribution_product_id TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS attribution_country TEXT;
ALTER TABLE public.growth_leads ADD COLUMN IF NOT EXISTS attribution_intent TEXT;

CREATE INDEX IF NOT EXISTS idx_growth_leads_crm_stage ON public.growth_leads(crm_stage);
CREATE INDEX IF NOT EXISTS idx_growth_leads_country ON public.growth_leads(country);
CREATE INDEX IF NOT EXISTS idx_growth_leads_duplicate_key ON public.growth_leads(duplicate_key);

-- 2. CREATE TABLE: growth_query_ownership
CREATE TABLE IF NOT EXISTS public.growth_query_ownership (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  country TEXT NOT NULL DEFAULT 'IN',
  primary_intent TEXT NOT NULL,
  primary_entity_type TEXT NOT NULL,
  primary_entity_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  confidence_score INT NOT NULL DEFAULT 800,
  cannibalization_status TEXT NOT NULL DEFAULT 'NONE' CHECK (cannibalization_status IN ('NONE', 'POTENTIAL_COLLISION', 'CONFIRMED_COLLISION', 'RESOLVED')),
  competing_urls TEXT[] DEFAULT '{}',
  recommended_action TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_ownership_normalized ON public.growth_query_ownership(normalized_query);
CREATE INDEX IF NOT EXISTS idx_query_ownership_canonical_url ON public.growth_query_ownership(canonical_url);
CREATE INDEX IF NOT EXISTS idx_query_ownership_cannibalization ON public.growth_query_ownership(cannibalization_status);

-- 3. ROW LEVEL SECURITY (RLS) FOR growth_query_ownership
ALTER TABLE public.growth_query_ownership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on growth_query_ownership" ON public.growth_query_ownership;
CREATE POLICY "Service role full access on growth_query_ownership"
ON public.growth_query_ownership
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin users full access on growth_query_ownership" ON public.growth_query_ownership;
CREATE POLICY "Admin users full access on growth_query_ownership"
ON public.growth_query_ownership
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
