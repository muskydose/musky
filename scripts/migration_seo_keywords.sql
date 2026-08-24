-- ============================================================
-- MUSKY DOSE - SUPABASE MIGRATION: SEO KEYWORDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'homepage',
  target_id TEXT,
  target_url TEXT NOT NULL DEFAULT '/',
  priority TEXT DEFAULT 'MEDIUM',
  active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations / Column Checks for seo_keywords
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'homepage';
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS target_url TEXT NOT NULL DEFAULT '/';
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM';
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Performance and Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_seo_keywords_active ON seo_keywords (active);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_target ON seo_keywords (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_priority ON seo_keywords (priority);

-- Enable Row Level Security
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read seo_keywords" ON seo_keywords;

-- RLS Policy: Server-side queries using SUPABASE_SERVICE_ROLE_KEY bypass RLS.
-- Private administrative access only.
