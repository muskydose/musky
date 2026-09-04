-- ============================================================
-- MUSKY DOSE — DATABASE MIGRATION 004
-- Title: Universal Product Intelligence Metadata Column
-- Scope: Table 'products'
-- Status: LOCAL SPECIFICATION ONLY — DO NOT EXECUTE IN PRODUCTION
-- ============================================================

-- 1. Add intelligence_metadata JSONB column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS intelligence_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create GIN index for high-performance querying on intelligence metadata fields
CREATE INDEX IF NOT EXISTS idx_products_intelligence_metadata ON products USING gin (intelligence_metadata);

-- 3. Document table column definition
COMMENT ON COLUMN products.intelligence_metadata IS 'Universal Product Intelligence V1.1 metadata storing governance status, canonical entity, scopes, and verified attributes with verification sources.';

