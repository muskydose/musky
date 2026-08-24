-- ============================================================
-- MUSKY DOSE - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ============================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT,
  short_description TEXT,
  full_description TEXT,
  price NUMERIC NOT NULL,
  compare_at_price NUMERIC,
  quantity TEXT,
  sku TEXT,
  images TEXT[] DEFAULT '{}',
  ingredients TEXT,
  benefits TEXT,
  usage TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  stock_status TEXT DEFAULT 'in_stock',
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  product_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT;

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_whatsapp TEXT,
  customer_email TEXT,
  customer_address TEXT,
  house_shop TEXT,
  area TEXT,
  landmark TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  order_status TEXT DEFAULT 'NEW',
  payment_status TEXT DEFAULT 'UNPAID',
  payment_method TEXT DEFAULT 'WhatsApp',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_whatsapp TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS house_shop TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_details TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_discount_amount NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number) WHERE order_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  house_shop TEXT,
  address TEXT,
  area TEXT,
  landmark TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  total_orders INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_shop TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode TEXT;

-- 5. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_name TEXT DEFAULT 'Musky Dose',
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  whatsapp_number TEXT DEFAULT '918233703080',
  contact_number TEXT DEFAULT '+91 82337 03080',
  email TEXT DEFAULT 'info@muskydose.in',
  address TEXT,
  socials JSONB DEFAULT '{}'::jsonb,
  hero_title TEXT,
  hero_subtitle TEXT,
  seo_title TEXT,
  seo_description TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Site Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- 6. PAYMENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  online_payment_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_order_enabled BOOLEAN DEFAULT TRUE,
  upi_enabled BOOLEAN DEFAULT FALSE,
  card_enabled BOOLEAN DEFAULT FALSE,
  netbanking_enabled BOOLEAN DEFAULT FALSE,
  merchant_id TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Payment Settings
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- 7. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BULK PRICING RULES TABLE
CREATE TABLE IF NOT EXISTS bulk_pricing_rules (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  min_quantity INT NOT NULL,
  max_quantity INT,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Bulk Pricing Rules
ALTER TABLE bulk_pricing_rules ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE bulk_pricing_rules ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 9. WHOLESALE ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS wholesale_enquiries (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  products TEXT,
  quantity TEXT,
  requested_quantity TEXT,
  enquiry_type TEXT DEFAULT 'wholesale',
  notes TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for Wholesale Enquiries
ALTER TABLE wholesale_enquiries ADD COLUMN IF NOT EXISTS requested_quantity TEXT;
ALTER TABLE wholesale_enquiries ADD COLUMN IF NOT EXISTS enquiry_type TEXT DEFAULT 'wholesale';

-- 10. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  festival_name TEXT,
  internal_description TEXT,
  public_heading TEXT NOT NULL,
  public_subtitle TEXT,
  public_description TEXT,
  status TEXT DEFAULT 'draft',
  is_manually_disabled BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC,
  allow_stack_with_bulk_pricing BOOLEAN DEFAULT FALSE,
  priority INT DEFAULT 0,
  target_type TEXT DEFAULT 'storewide',
  target_category_ids TEXT[] DEFAULT '{}',
  target_product_ids TEXT[] DEFAULT '{}',
  excluded_product_ids TEXT[] DEFAULT '{}',
  coupon_required BOOLEAN DEFAULT FALSE,
  coupon_code TEXT,
  usage_limit INT,
  per_customer_limit INT,
  current_usage_count INT DEFAULT 0,
  show_banner BOOLEAN DEFAULT FALSE,
  banner_heading TEXT,
  banner_subtitle TEXT,
  banner_description TEXT,
  banner_image_url TEXT,
  banner_cta_text TEXT,
  banner_cta_link TEXT,
  banner_position TEXT DEFAULT 'announcement_bar',
  show_countdown BOOLEAN DEFAULT FALSE,
  badge_text TEXT,
  badge_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CAMPAIGN USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS campaign_usage (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  coupon_code TEXT,
  order_id TEXT,
  customer_phone TEXT,
  discount_amount NUMERIC,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ADMIN OTPS RECOVERY TABLE
CREATE TABLE IF NOT EXISTS admin_otps (
  mobile TEXT PRIMARY KEY,
  hashed_otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  resend_allowed_at TIMESTAMPTZ NOT NULL,
  request_count INT DEFAULT 1,
  rate_window_start TIMESTAMPTZ DEFAULT NOW(),
  consumed BOOLEAN DEFAULT FALSE,
  reset_token_hash TEXT,
  reset_token_consumed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SEO KEYWORDS TABLE
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

-- Migrations for SEO Keywords
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'homepage';
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS target_url TEXT NOT NULL DEFAULT '/';
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM';
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_seo_keywords_active ON seo_keywords (active);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_target ON seo_keywords (target_type, target_id);

-- 14. PRODUCT GUIDES TABLE
CREATE TABLE IF NOT EXISTS product_guides (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cover_image TEXT,
  short_intro TEXT,
  product_id TEXT,
  product_ids TEXT[] DEFAULT '{}',
  overview TEXT,
  what_is_this TEXT,
  key_benefits TEXT[] DEFAULT '{}',
  ingredients TEXT[] DEFAULT '{}',
  who_should_use TEXT,
  who_should_avoid TEXT,
  how_to_use TEXT,
  quantity_preparation TEXT,
  storage_instructions TEXT,
  important_notes TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  related_product_ids TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  published BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_guides_slug ON product_guides (slug);
CREATE INDEX IF NOT EXISTS idx_product_guides_published ON product_guides (published);

-- -- 15. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_email TEXT,
  resource TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Step 1: Enable RLS on all 15 tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all legacy/permissive policies
DROP POLICY IF EXISTS "Allow public read categories" ON categories;
DROP POLICY IF EXISTS "Allow public read products" ON products;
DROP POLICY IF EXISTS "Allow public read site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow public read payment_settings" ON payment_settings;
DROP POLICY IF EXISTS "Allow public read bulk_pricing_rules" ON bulk_pricing_rules;
DROP POLICY IF EXISTS "Allow public read campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow public read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow public read admin_otps" ON admin_otps;
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow public read customers" ON customers;
DROP POLICY IF EXISTS "Allow public read campaign_usage" ON campaign_usage;
DROP POLICY IF EXISTS "Allow public read wholesale_enquiries" ON wholesale_enquiries;
DROP POLICY IF EXISTS "Allow public read product_guides" ON product_guides;
DROP POLICY IF EXISTS "Allow public read audit_logs" ON audit_logs;

DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert wholesale_enquiries" ON wholesale_enquiries;

-- Step 3: Public READ-ONLY access strictly for public storefront catalog (Strict TRUE checks, no NULL leakage)
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (is_active IS TRUE);
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (is_active IS TRUE);
CREATE POLICY "Allow public read bulk_pricing_rules" ON bulk_pricing_rules FOR SELECT USING (is_active IS TRUE);
CREATE POLICY "Allow public read product_guides" ON product_guides FOR SELECT USING (published IS TRUE);

-- Step 4: Private tables (site_settings, payment_settings, campaigns, orders, customers, admin_users, admin_otps, wholesale_enquiries, campaign_usage, audit_logs)
-- RLS enabled on all private tables.
-- NO public select/insert/update/delete policies exist for private tables.
-- All administrative, checkout, site setting reads, coupon validation, audit logging and usage tracking proceed securely server-side using SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS automatically via the service_role database user.

-- 12. ATOMIC CAMPAIGN USAGE INCREMENT RPC FUNCTION
CREATE OR REPLACE FUNCTION increment_campaign_usage(
  p_campaign_id TEXT,
  p_coupon_code TEXT DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_customer_usage_count INT := 0;
  v_new_usage_count INT;
  v_usage_id TEXT;
  v_clean_phone TEXT := NULL;
BEGIN
  IF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
    v_clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
  END IF;

  -- Lock the campaign row exclusively to guarantee atomic evaluation across concurrent checkouts
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  -- Verify campaign is not manually disabled or inactive status
  IF v_campaign.is_manually_disabled = TRUE OR v_campaign.status = 'disabled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign is disabled');
  END IF;

  -- Verify campaign timeframe
  IF v_campaign.start_date IS NOT NULL AND NOW() < v_campaign.start_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign has not started yet');
  END IF;

  IF v_campaign.end_date IS NOT NULL AND NOW() > v_campaign.end_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign has expired');
  END IF;

  -- Enforce total campaign usage limit atomically
  IF v_campaign.usage_limit IS NOT NULL AND v_campaign.current_usage_count >= v_campaign.usage_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign total usage limit reached');
  END IF;

  -- Enforce per-customer usage limit atomically
  IF v_campaign.per_customer_limit IS NOT NULL AND v_clean_phone IS NOT NULL AND v_clean_phone != '' THEN
    SELECT COUNT(*) INTO v_customer_usage_count
    FROM campaign_usage
    WHERE campaign_id = p_campaign_id
      AND customer_phone = v_clean_phone;

    IF v_customer_usage_count >= v_campaign.per_customer_limit THEN
      RETURN jsonb_build_object('success', false, 'error', 'Per-customer usage limit reached for this campaign');
    END IF;
  END IF;

  -- Atomically increment campaign usage counter
  UPDATE campaigns
  SET current_usage_count = COALESCE(current_usage_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING current_usage_count INTO v_new_usage_count;

  -- Insert usage record
  v_usage_id := 'usage-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::int;
  INSERT INTO campaign_usage (
    id,
    campaign_id,
    coupon_code,
    order_id,
    customer_phone,
    discount_amount,
    used_at
  ) VALUES (
    v_usage_id,
    p_campaign_id,
    p_coupon_code,
    p_order_id,
    v_clean_phone,
    COALESCE(p_discount_amount, 0),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_usage_count', v_new_usage_count,
    'usage_id', v_usage_id
  );
END;
$$;

-- Revoke public execution of campaign RPCs to prevent untrusted execution
REVOKE EXECUTE ON FUNCTION increment_campaign_usage(TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_usage(TEXT, TEXT, TEXT, TEXT, NUMERIC) TO service_role;

-- Rollback function in case order creation fails after increment
CREATE OR REPLACE FUNCTION rollback_campaign_usage(
  p_campaign_id TEXT,
  p_usage_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usage_id IS NOT NULL AND p_usage_id != '' THEN
    DELETE FROM campaign_usage WHERE id = p_usage_id;
  END IF;

  UPDATE campaigns
  SET current_usage_count = GREATEST(0, COALESCE(current_usage_count, 1) - 1),
      updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION rollback_campaign_usage(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rollback_campaign_usage(TEXT, TEXT) TO service_role;

-- =========================================================================
-- ADDITIONAL HIGH-PERFORMANCE INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_products_lookup ON products(slug, is_active, category_id, is_featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_lookup ON categories(slug, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_lookup ON orders(order_number, idempotency_key, order_status, payment_status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_phone, customer_email, customer_state, customer_city);
CREATE INDEX IF NOT EXISTS idx_customers_lookup ON customers(phone, email, state, city, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_otps_lookup ON admin_otps(mobile, expires_at);

-- =========================================================================
-- MUSKY GROWTH AI DATA TABLES & RLS
-- =========================================================================

CREATE TABLE IF NOT EXISTS growth_markets (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 3,
  demand_score NUMERIC DEFAULT 0,
  henna_culture_score NUMERIC DEFAULT 0,
  wedding_density NUMERIC DEFAULT 0,
  salon_density NUMERIC DEFAULT 0,
  wholesale_potential NUMERIC DEFAULT 0,
  d2c_readiness NUMERIC DEFAULT 0,
  logistics_ease NUMERIC DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_markets_geo ON growth_markets(state, district, city, priority);

CREATE TABLE IF NOT EXISTS growth_keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT UNIQUE NOT NULL,
  language TEXT DEFAULT 'en',
  category TEXT,
  intent TEXT,
  target_audience TEXT,
  state TEXT,
  city TEXT,
  search_volume INTEGER DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  competition NUMERIC DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  source_tier TEXT DEFAULT 'ESTIMATED',
  data_source TEXT DEFAULT 'system',
  last_sync_date TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_keywords_kw ON growth_keywords(keyword, category, source_tier);

CREATE TABLE IF NOT EXISTS growth_keyword_snapshots (
  id TEXT PRIMARY KEY,
  keyword_id TEXT NOT NULL REFERENCES growth_keywords(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  search_volume INTEGER DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  competition NUMERIC DEFAULT 0,
  source_tier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_kw_snapshots ON growth_keyword_snapshots(keyword_id, snapshot_date);

CREATE TABLE IF NOT EXISTS growth_leads (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  state TEXT NOT NULL,
  district TEXT,
  city TEXT NOT NULL,
  status TEXT DEFAULT 'NEW',
  score NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'MEDIUM',
  source TEXT DEFAULT 'Manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_leads_geo ON growth_leads(state, city, status, priority);

CREATE TABLE IF NOT EXISTS growth_competitors (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  brand_type TEXT,
  strength_score NUMERIC DEFAULT 0,
  price_positioning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS growth_competitor_observations (
  id TEXT PRIMARY KEY,
  competitor_id TEXT NOT NULL REFERENCES growth_competitors(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL,
  details JSONB,
  observed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS growth_data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IDLE',
  quality_score NUMERIC DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS growth_sync_logs (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES growth_data_sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS growth_recommendations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  impact TEXT NOT NULL,
  urgency TEXT NOT NULL,
  confidence TEXT NOT NULL,
  explanation TEXT NOT NULL,
  action_plan JSONB,
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS growth_async_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  progress INTEGER DEFAULT 0,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_async_jobs ON growth_async_jobs(id, type, status, created_at);

-- RLS Security Policies for Growth Tables
ALTER TABLE growth_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_keyword_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_competitor_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_async_jobs ENABLE ROW LEVEL SECURITY;

-- Block public/anon access to Growth AI tables; service_role bypasses RLS
CREATE POLICY "Deny anon access to growth_markets" ON growth_markets FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_keywords" ON growth_keywords FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_keyword_snapshots" ON growth_keyword_snapshots FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_leads" ON growth_leads FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_competitors" ON growth_competitors FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_competitor_observations" ON growth_competitor_observations FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_data_sources" ON growth_data_sources FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_sync_logs" ON growth_sync_logs FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_recommendations" ON growth_recommendations FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon access to growth_async_jobs" ON growth_async_jobs FOR ALL TO anon USING (false);




