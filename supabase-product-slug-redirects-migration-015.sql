-- ==============================================================================
-- MUSKY DOSE — MIGRATION 015: PRODUCT LIFECYCLE & DETERMINISTIC SLUG REDIRECTS
-- ==============================================================================

-- 1. Product Slug History & Redirects Table
CREATE TABLE IF NOT EXISTS product_slug_redirects (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  old_slug TEXT NOT NULL UNIQUE,
  current_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_slug_redirects_old ON product_slug_redirects(old_slug);
CREATE INDEX IF NOT EXISTS idx_product_slug_redirects_product ON product_slug_redirects(product_id);

-- Enable RLS
ALTER TABLE product_slug_redirects ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_slug_redirects' AND policyname = 'Allow public read product_slug_redirects'
  ) THEN
    CREATE POLICY "Allow public read product_slug_redirects" ON product_slug_redirects FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_slug_redirects' AND policyname = 'Allow service_role write product_slug_redirects'
  ) THEN
    CREATE POLICY "Allow service_role write product_slug_redirects" ON product_slug_redirects FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 2. Extend Products Table with Lifecycle Support (Idempotent & Backward-Compatible)
ALTER TABLE products ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE products ADD COLUMN IF NOT EXISTS replacement_slug TEXT;

-- 3. Synchronize existing hidden products (e.g. prod-3) to 'HIDDEN' lifecycle status
UPDATE products 
SET lifecycle_status = 'HIDDEN' 
WHERE is_active IS FALSE AND (lifecycle_status IS NULL OR lifecycle_status = 'ACTIVE' OR lifecycle_status = 'SAVED');

-- 4. Index on lifecycle_status for fast queries
CREATE INDEX IF NOT EXISTS idx_products_lifecycle ON products(lifecycle_status, is_active);
