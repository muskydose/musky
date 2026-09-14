-- ============================================================================
-- MUSKY DOSE — UNIVERSAL GROWTH & OMNICHANNEL DISTRIBUTION MIGRATION (008)
--
-- STATUS: Strictly Additive & Idempotent
-- PURPOSE:
-- Provides persistent storage for omni-channel distribution drafts (Google Business Profile,
-- Instagram, Facebook) and growth opportunity actions.
--
-- GUARANTEES:
-- - Zero DROP or TRUNCATE operations
-- - RLS enabled (Public blocked, Authenticated Admin allowed)
-- - Zero impact on legacy data
-- ============================================================================

-- 1. CREATE TABLE: growth_distribution_drafts
CREATE TABLE IF NOT EXISTS public.growth_distribution_drafts (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('GOOGLE_BUSINESS', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'YOUTUBE')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE', 'BRAND', 'PAGE')),
  entity_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  formatted_copy TEXT NOT NULL,
  media_attachment_url TEXT,
  target_destination_url TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  call_to_action TEXT NOT NULL DEFAULT 'Learn More',
  status TEXT NOT NULL DEFAULT 'DRAFT_READY' CHECK (status IN ('DRAFT_READY', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_distribution_channel
ON public.growth_distribution_drafts (channel);

CREATE INDEX IF NOT EXISTS idx_distribution_entity
ON public.growth_distribution_drafts (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_distribution_status
ON public.growth_distribution_drafts (status);

CREATE INDEX IF NOT EXISTS idx_distribution_created
ON public.growth_distribution_drafts (created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.growth_distribution_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if re-running
DROP POLICY IF EXISTS "Service role full access on growth_distribution_drafts" ON public.growth_distribution_drafts;

-- Allow service role full access
CREATE POLICY "Service role full access on growth_distribution_drafts"
ON public.growth_distribution_drafts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

