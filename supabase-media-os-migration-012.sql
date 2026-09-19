-- ============================================================================
-- MUSKY DOSE — MEDIA OPERATING SYSTEM CANONICAL MIGRATION (012)
--
-- STATUS: Strictly Additive & Idempotent (No DROP TABLE, No TRUNCATE)
-- PURPOSE:
-- 1. Enhances public.media_assets with asset_origin, slot_key, lineage (parent_asset_id, derivative_type), and health_status.
-- 2. Expands role CHECK constraint to include all canonical slot roles.
-- 3. Creates public.media_jobs for durable, idempotent, concurrency-safe worker execution.
-- ============================================================================

-- 1. ADD COLUMNS TO public.media_assets
ALTER TABLE public.media_assets 
  ADD COLUMN IF NOT EXISTS asset_origin TEXT DEFAULT 'manual_approved';

ALTER TABLE public.media_assets 
  ADD COLUMN IF NOT EXISTS slot_key TEXT;

ALTER TABLE public.media_assets 
  ADD COLUMN IF NOT EXISTS parent_asset_id TEXT;

ALTER TABLE public.media_assets 
  ADD COLUMN IF NOT EXISTS derivative_type TEXT;

ALTER TABLE public.media_assets 
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'HEALTHY';

-- 2. EXPAND ROLE CHECK CONSTRAINT
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_role_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_role_check CHECK (role IN (
  'PRIMARY',
  'GALLERY',
  'PACKAGING',
  'LIFESTYLE',
  'DETAIL',
  'USAGE',
  'INGREDIENTS',
  'HERO',
  'OG_SOCIAL',
  'ICON',
  'PROCESS',
  'INFOGRAPHIC',
  'MOBILE_HERO',
  'DESKTOP_HERO',
  'SOCIAL_SQUARE',
  'SOCIAL_PORTRAIT',
  'THUMBNAIL',
  'BANNER',
  'COMPARISON'
));

-- 3. ASSET ORIGIN CHECK CONSTRAINT
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_origin_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_origin_check CHECK (asset_origin IN (
  'real_owner_photo',
  'temporary_visual',
  'ai_generated',
  'derived_from_real',
  'programmatic_template',
  'manual_approved',
  'legacy_archived'
));

-- 4. CREATE TABLE: public.media_jobs
CREATE TABLE IF NOT EXISTS public.media_jobs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE', 'BRAND', 'MARKETING')),
  entity_id TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'IN_PROGRESS',
    'WAITING_PROVIDER',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'BLOCKED'
  )),
  strategy TEXT NOT NULL CHECK (strategy IN (
    'REAL',
    'DERIVED',
    'TEMPLATE',
    'AI',
    'TEMPORARY',
    'MANUAL_REQUIRED',
    'NO_ACTION'
  )),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  provider TEXT,
  blueprint_prompt TEXT,
  result_asset_id TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INDEXES FOR PERFORMANCE & DEDUPLICATION
CREATE INDEX IF NOT EXISTS idx_media_assets_slot_key 
  ON public.media_assets (slot_key);

CREATE INDEX IF NOT EXISTS idx_media_assets_origin 
  ON public.media_assets (asset_origin);

CREATE INDEX IF NOT EXISTS idx_media_assets_parent 
  ON public.media_assets (parent_asset_id);

CREATE INDEX IF NOT EXISTS idx_media_jobs_status 
  ON public.media_jobs (status);

CREATE INDEX IF NOT EXISTS idx_media_jobs_entity_slot 
  ON public.media_jobs (entity_type, entity_id, slot_key);

-- 6. UNIQUE CONCURRENCY & IDEMPOTENCY PARTIAL INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_media_job 
  ON public.media_jobs (entity_type, entity_id, slot_key) 
  WHERE status IN ('PENDING', 'IN_PROGRESS', 'WAITING_PROVIDER');

-- 7. ROW LEVEL SECURITY (RLS) FOR media_jobs
ALTER TABLE public.media_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role full access on media_jobs" ON public.media_jobs;
CREATE POLICY "Allow service_role full access on media_jobs"
  ON public.media_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read media_jobs" ON public.media_jobs;
CREATE POLICY "Allow authenticated read media_jobs"
  ON public.media_jobs FOR SELECT
  TO authenticated
  USING (true);

