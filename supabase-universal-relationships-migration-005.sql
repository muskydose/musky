-- ============================================================================
-- MUSKY DOSE — UNIVERSAL ENTITY RELATIONSHIPS SCHEMA MIGRATION (PHASE 1)
--
-- STATUS: FOR ADMINISTRATIVE REVIEW ONLY — DO NOT EXECUTE DESTRUCTIVELY
-- NATURE: Strictly Additive & Idempotent
--
-- PURPOSE:
-- Universal relationship bridge connecting PRODUCT, CATEGORY, GUIDE, and KNOWLEDGE
-- entities with deterministic relevance scoring, human governance (suggested/approved/rejected),
-- explainability reasons, GSC signals, and first-class visual context.
-- ============================================================================

-- 1. CREATE TABLE: entity_relationships
CREATE TABLE IF NOT EXISTS entity_relationships (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE')),
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE')),
  target_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  relevance_score NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  confidence TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'rejected')),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  visual_context JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_entity_relationships UNIQUE (source_type, source_id, target_type, target_id, relationship_type)
);

-- 2. HIGH-SCALE LOOKUP & FILTERING INDEXES
CREATE INDEX IF NOT EXISTS idx_entity_rel_source
ON entity_relationships (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_entity_rel_target
ON entity_relationships (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_entity_rel_status
ON entity_relationships (status);

CREATE INDEX IF NOT EXISTS idx_entity_rel_type
ON entity_relationships (relationship_type);

CREATE INDEX IF NOT EXISTS idx_entity_rel_score
ON entity_relationships (relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_entity_rel_compound_lookup
ON entity_relationships (source_type, source_id, status);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read approved entity_relationships" ON entity_relationships;

-- Public read access strictly for APPROVED relationships (Fail-closed against rejected/unverified)
CREATE POLICY "Allow public read approved entity_relationships"
ON entity_relationships FOR SELECT
USING (status = 'approved');

-- Administrative service-role key has full access automatically via service_role user.

