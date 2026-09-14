-- ============================================================================
-- MUSKY DOSE — UNIVERSAL MEDIA ASSETS SCHEMA MIGRATION (PHASE 3.2)
--
-- NATURE: Strictly Additive & Idempotent (No DROP, No TRUNCATE)
--
-- PURPOSE:
-- Establishes the canonical relational foundation for all visual assets across
-- PRODUCT, CATEGORY, GUIDE, KNOWLEDGE, BRAND, and MARKETING entities.
-- Features:
-- 1. Dual AI/Manual provenance tracking with human governance (suggested/approved/rejected/archived).
-- 2. Anti-hallucination visual context and approved facts payload (JSONB).
-- 3. Content deduplication via SHA-256 file hashes.
-- 4. Manual-primary locking (is_locked) to guarantee AI never demotes human decisions.
-- 5. Row Level Security (RLS) public SELECT gating on status = 'approved'.
-- ============================================================================

-- 1. CREATE TABLE: public.media_assets
CREATE TABLE IF NOT EXISTS public.media_assets (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE', 'BRAND', 'MARKETING')),
  entity_id TEXT, -- Nullable for global / brand assets
  url TEXT NOT NULL,
  storage_path TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'product-images',
  file_hash TEXT, -- SHA-256 hash for binary deduplication
  file_name TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/webp',
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  aspect_ratio TEXT DEFAULT '1:1',
  role TEXT NOT NULL DEFAULT 'GALLERY' CHECK (role IN (
    'PRIMARY',
    'GALLERY',
    'PACKAGING',
    'LIFESTYLE',
    'DETAIL',
    'USAGE',
    'INGREDIENTS',
    'HERO',
    'OG_SOCIAL',
    'ICON'
  )),
  source TEXT NOT NULL DEFAULT 'MANUAL_UPLOAD' CHECK (source IN (
    'MANUAL_UPLOAD',
    'AI_GENERATED',
    'EXTERNAL_IMPORT',
    'SYSTEM_FALLBACK'
  )),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN (
    'suggested',
    'approved',
    'rejected',
    'archived'
  )),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT,
  alt_text TEXT,
  caption TEXT,
  visual_context JSONB DEFAULT '{}'::jsonb,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INDEXES FOR PERFORMANCE, FILTERING & DEDUPLICATION
CREATE INDEX IF NOT EXISTS idx_media_assets_entity 
  ON public.media_assets (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_role_status 
  ON public.media_assets (entity_type, entity_id, role, status);

CREATE INDEX IF NOT EXISTS idx_media_assets_file_hash 
  ON public.media_assets (file_hash);

CREATE INDEX IF NOT EXISTS idx_media_assets_status 
  ON public.media_assets (status);

CREATE INDEX IF NOT EXISTS idx_media_assets_sort_order 
  ON public.media_assets (sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_media_assets_created_at 
  ON public.media_assets (created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read approved media_assets" ON public.media_assets;

-- Public read access strictly for APPROVED media assets
CREATE POLICY "Allow public read approved media_assets"
ON public.media_assets FOR SELECT
USING (status = 'approved');

-- Service role bypass is automatic for administrative CRUD operations.

