-- ============================================================================
-- MUSKY DOSE — UNIVERSAL PLATFORM GOVERNANCE MIGRATION V1.0
--
-- STATUS: FOR ADMINISTRATIVE REVIEW ONLY — DO NOT EXECUTE AUTOMATICALLY
-- NATURE: Strictly Additive & Non-Destructive
--
-- PURPOSE:
-- 1. Adds durable database-backed idempotency key to orders table,
--    eliminating serverless multi-instance race conditions and duplicate orders.
-- 2. Adds high-scale B-tree indexes for orders, products, guides, and leads.
-- ============================================================================

-- 1. ORDERS TABLE: Add durable idempotency key column
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. UNIQUE INDEX: Ensure idempotency key is strictly unique across all orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
ON orders (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 3. ORDERS TABLE: High-scale query indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id_created_at
ON orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc
ON orders (created_at DESC);

-- 4. PRODUCTS TABLE: Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id
ON products (category_id);

CREATE INDEX IF NOT EXISTS idx_products_status
ON products (status);

-- 5. PRODUCT GUIDES TABLE: Slugs and product relations
CREATE INDEX IF NOT EXISTS idx_product_guides_slug
ON product_guides (slug);

CREATE INDEX IF NOT EXISTS idx_product_guides_product_id
ON product_guides (product_id);

-- 6. WHOLESALE INQUIRIES & LEADS: Status and timeline indexes
CREATE INDEX IF NOT EXISTS idx_wholesale_inquiries_status
ON wholesale_inquiries (status);

CREATE INDEX IF NOT EXISTS idx_wholesale_inquiries_created_at
ON wholesale_inquiries (created_at DESC);
