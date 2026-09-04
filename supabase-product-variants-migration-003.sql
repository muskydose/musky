-- ============================================================
-- MUSKY DOSE — PRODUCT VARIANTS MIGRATION 003
-- Safe, Additive, Idempotent Schema Expansion
-- ============================================================

-- 1. Additive variants column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. GIN Index for fast JSONB querying
CREATE INDEX IF NOT EXISTS idx_products_variants ON products USING gin (variants);

