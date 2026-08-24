# 05 — DATABASE SCHEMA & SUPABASE INTEGRATION

This document details the database architecture, schema definitions, relationships, Row Level Security (RLS) policies, and RPC stored procedures.

---

## 1. Database Overview & Architecture
The primary database for Musky Dose is **Supabase PostgreSQL**. The system is designed with dual-mode operational resilience:
1. **Production Engine:** Connects via `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (`getSupabaseAdmin()` in `lib/supabase.ts`).
2. **Local Fallback:** If environment variables are missing, read operations fall back gracefully to structured initial memory data (`lib/data-store.ts`), preventing app crashes.

---

## 2. Core E-Commerce Schema (14 Tables)

```
                       ┌─────────────────┐
                       │   categories    │
                       └────────┬────────┘
                                │ 1
                                │
                                │ N
                       ┌────────┴────────┐
                       │    products     │
                       └────────┬────────┘
                                │
                        ┌───────┴───────┐
                        │               │
               ┌────────▼──────┐ ┌──────▼────────┐
               │     orders    │ │ bulk_pricing  │
               └───────┬───────┘ └───────────────┘
                       │
                       │ N
                       │
                       │ 1
               ┌───────▼───────┐
               │   customers   │
               └───────────────┘
```

### Table Definitions (`supabase-schema.sql`)

1. **`categories`**
   - `id` (TEXT, PK): Unique category identifier (e.g. `cat-1`).
   - `name` (TEXT): Category display name (e.g. `Henna`).
   - `slug` (TEXT, UNIQUE): URL slug (e.g. `henna`).
   - `description` (TEXT): Category summary.
   - `image` (TEXT): Thumbnail image path.
   - `sort_order` (INT): Sorting order on storefront.
   - `is_active` (BOOLEAN): Active status flag.

2. **`products`**
   - `id` (TEXT, PK): Unique product identifier.
   - `name` (TEXT): Product name.
   - `slug` (TEXT, UNIQUE): Product URL slug.
   - `category_id` (TEXT, FK -> `categories.id`): Associated category ID.
   - `category_name` (TEXT): Cached category name.
   - `short_description` (TEXT): Short summary.
   - `full_description` (TEXT): Full botanical description.
   - `price` (NUMERIC): Selling price in INR (₹).
   - `compare_at_price` (NUMERIC): Original strikethrough price.
   - `quantity` (TEXT): Pack size/weight (e.g. `250g Pack`).
   - `sku` (TEXT): Unique stock keeping unit code.
   - `images` (TEXT[]): Array of product image URLs.
   - `ingredients` (TEXT): Botanical ingredient list.
   - `benefits` (TEXT): Product benefits list.
   - `usage` (TEXT): Application instructions.
   - `in_stock` (BOOLEAN): Legacy stock boolean.
   - `stock_status` (TEXT): Stock availability status (`in_stock` / `out_of_stock`).
   - `is_featured` (BOOLEAN): Homepage bestseller flag.
   - `is_active` (BOOLEAN): Storefront publication status.
   - `sort_order` (INT): Display sort order.
   - `product_type` (TEXT): Category classification (`POWDER`, `FINISHED`, `RAW`).

3. **`orders`**
   - `id` (TEXT, PK): Unique order identifier.
   - `order_number` (TEXT, UNIQUE): Human-readable order code (e.g. `ORD-20260822-X9K2`).
   - `customer_name` (TEXT), `customer_phone` (TEXT), `customer_whatsapp` (TEXT), `customer_email` (TEXT).
   - `customer_address` (TEXT), `house_shop` (TEXT), `area` (TEXT), `landmark` (TEXT), `city` (TEXT), `state` (TEXT), `pincode` (TEXT).
   - `items` (JSONB): Array of ordered items (`productId`, `productName`, `quantity`, `price`, `weight`).
   - `subtotal` (NUMERIC), `discount_amount` (NUMERIC), `shipping_fee` (NUMERIC), `total_amount` (NUMERIC).
   - `order_status` (TEXT): Status workflow (`NEW`, `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
   - `payment_status` (TEXT): Payment tracking status (`UNPAID`, `PENDING`, `PAID`, `FAILED`, `REFUNDED`).
   - `payment_method` (TEXT): Default `WhatsApp`.
   - `idempotency_key` (TEXT, UNIQUE): Prevents duplicate order creation on network retries.

4. **`customers`**
   - `id` (TEXT, PK), `name` (TEXT), `phone` (TEXT, UNIQUE), `whatsapp` (TEXT), `email` (TEXT).
   - `address` fields, `total_orders` (INT), `total_spent` (NUMERIC), `last_order_at` (TIMESTAMPTZ).

5. **`site_settings`**
   - `id` (TEXT, PK, Default `'default'`), `brand_name`, `tagline`, `logo_url`, `favicon_url`, `whatsapp_number`, `contact_number`, `email`, `address`, `socials` (JSONB), `data` (JSONB).

6. **`payment_settings`**
   - `id` (TEXT, PK, Default `'default'`), `online_payment_enabled` (BOOLEAN, Always `false`), `whatsapp_order_enabled` (BOOLEAN, `true`), `upi_enabled`, `card_enabled`, `netbanking_enabled`, `data` (JSONB).

7. **`admin_users`**
   - `id` (TEXT, PK), `email` (TEXT, UNIQUE), `password_hash` (TEXT, scrypt), `name` (TEXT), `role` (TEXT).

8. **`bulk_pricing_rules`** — Tiered quantity discounts (`min_quantity`, `max_quantity`, `discount_value`).
9. **`wholesale_enquiries`** — B2B trade enquiry submissions.
10. **`campaigns`** — Marketing campaigns, seasonal banners, and promo codes.
11. **`campaign_usage`** — Tracks campaign coupon redemptions per order and per customer phone.
12. **`admin_otps`** — Mobile OTP recovery codes & reset authorization token hashes.
13. **`seo_keywords`** — Target SEO keywords catalog.
14. **`product_guides`** — Botanical usage articles & guides.

---

## 3. Musky Growth AI Schema (12 Tables)
Defined in `supabase-growth-schema.sql` to power regional demand intelligence:
1. `growth_markets` — Geographic markets across India states/districts.
2. `growth_market_metrics` — Market opportunity and product demand scores.
3. `growth_keywords` — Search volume and CPC keyword intelligence.
4. `growth_keyword_snapshots` — Historical keyword search volume snapshots.
5. `growth_leads` — B2B Wholesale CRM leads directory.
6. `growth_competitors` — Competitor registry.
7. `growth_competitor_observations` — Observed competitor market prices.
8. `growth_data_sources` — External data connectors registry.
9. `growth_data_sync_logs` — Data synchronization audit trail.
10. `growth_recommendations` — AI strategic action items feed.
11. `growth_import_jobs` — Bulk CSV import job tracker.
12. `growth_settings` — Demand scoring weight configurations.

---

## 4. Row Level Security (RLS) & RPC Functions

### Security Principles
- **Public Tables:** `categories`, `products`, `bulk_pricing_rules`, and `product_guides` have RLS policies permitting public `SELECT` access strictly for active items (`is_active = true`).
- **Private Tables:** `site_settings`, `payment_settings`, `orders`, `customers`, `campaigns`, `admin_users`, `admin_otps`, `wholesale_enquiries`, and all 12 `growth_*` tables have **no public SELECT/INSERT/UPDATE/DELETE policies**.
- **Service Role Bypass:** All administrative reads and writes execute server-side using `SUPABASE_SERVICE_ROLE_KEY`, which automatically bypasses RLS.

### Atomic Campaign Usage Increment (`increment_campaign_usage` RPC)
To prevent race conditions during peak checkout volume, coupon redemption is processed via a PostgreSQL PL/pgSQL function:
```sql
CREATE OR REPLACE FUNCTION increment_campaign_usage(
  p_campaign_id TEXT,
  p_coupon_code TEXT DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0
) RETURNS JSONB ...
```
- Acquires an exclusive row lock (`FOR UPDATE`) on the campaign record.
- Verifies timeframe (`start_date`, `end_date`), manual disable flag, total usage limit, and per-customer limit.
- Atomically increments `current_usage_count` and records a tracking entry in `campaign_usage`.
- Includes a companion `rollback_campaign_usage` RPC to safely decrement usage if order creation subsequently fails.
