-- ============================================================
-- MUSKY DOSE — COMMERCE & B2B MIGRATION 002
-- Additive, Non-Destructive Schema Expansion
-- ============================================================

-- 1. Products Table Additions (Variants & Real Inventory)
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0;

-- 2. Orders Table Additions (Extended Status Lifecycle & Logistics)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- 3. Site Settings (Commerce Feature Flags & Payment Gateways)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS shipping_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS invoice_config JSONB DEFAULT '{}'::jsonb;

-- 4. Indexes for Performance at Scale
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

