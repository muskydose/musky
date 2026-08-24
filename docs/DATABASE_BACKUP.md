# MUSKY DOSE — DATABASE BACKUP & RECOVERY PROTOCOLS

## 1. PURPOSE & OVERVIEW
This document specifies the technical procedures for database backup, point-in-time schema restoration, disaster recovery playbooks, and environment safety for the Musky Dose platform.

Primary Database: **Supabase PostgreSQL**
Server Database Access Layer: `/lib/server-db.ts`
Fallback In-Memory Store: `/lib/data-store.ts`

---

## 2. CRITICAL PRODUCTION INVARIANTS
- **Canonical Website Domain**: `https://muskydose.in`
- **Primary Business WhatsApp Number**: `918233703080`
- **Online Payment Status**: **DISABLED** (`online_payment_enabled = false`)
- **Primary Order Channel**: WhatsApp Direct Ordering

---

## 3. CORE DATABASE TABLES & SCHEMAS

The canonical SQL schema is defined in `/supabase-schema.sql`.

### 3.1 `categories` Table
- `id` (TEXT, PK): Unique identifier (e.g. `c1`)
- `name` (TEXT, NOT NULL): Category display name
- `slug` (TEXT, UNIQUE, NOT NULL): URL-friendly slug
- `description` (TEXT): Category summary
- `image` (TEXT): CDN image URL
- `sort_order` (INT, DEFAULT 0): Display order
- `is_active` (BOOLEAN, DEFAULT TRUE): Visibility status
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3.2 `products` Table
- `id` (TEXT, PK): Unique identifier
- `name` (TEXT, NOT NULL): Product display name
- `slug` (TEXT, UNIQUE, NOT NULL): URL-friendly slug
- `category_id` (TEXT, FK references `categories(id)` ON DELETE SET NULL)
- `category_name` (TEXT): Denormalized category name for fast lookup
- `short_description` (TEXT): Summary card snippet
- `full_description` (TEXT): Detailed description
- `price` (NUMERIC, NOT NULL): Authoritative sale price
- `compare_at_price` (NUMERIC): Original price for discount badge
- `quantity` (TEXT): Net weight / package size (e.g., `100g`, `250g`)
- `sku` (TEXT): Stock Keeping Unit code
- `images` (TEXT[]): CDN image URLs array
- `ingredients` (TEXT): Natural ingredient list
- `benefits` (TEXT): Key health & beauty benefits
- `usage` (TEXT): Directions for use
- `in_stock` (BOOLEAN, DEFAULT TRUE): Stock availability
- `is_featured` (BOOLEAN, DEFAULT FALSE): Homepage highlight tag
- `is_active` (BOOLEAN, DEFAULT TRUE): Catalog visibility
- `sort_order` (INT, DEFAULT 0): Display priority
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.3 `orders` Table
- `id` (TEXT, PK): Unique order reference (e.g. `MD-1001`)
- `customer_name` (TEXT, NOT NULL): Customer name
- `customer_phone` (TEXT, NOT NULL): Contact phone number
- `customer_email`, `customer_address` (TEXT): Customer details
- `total_amount` (NUMERIC, NOT NULL): Server-validated order total
- `order_status` (TEXT, DEFAULT 'NEW'): `NEW`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- `payment_status` (TEXT, DEFAULT 'UNPAID'): Strictly `UNPAID` for WhatsApp orders
- `payment_method` (TEXT, DEFAULT 'WhatsApp')
- `items` (JSONB): Array of snapshots of purchased products
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.4 `site_settings` & `payment_settings`
- Holds global site configuration, WhatsApp phone numbers, contact address, SEO default tags, and payment toggle flags.

---

## 4. BACKUP EXECUTION PROCEDURES

### 4.1 Schema Backup
The database schema is version-controlled in the repository at `/supabase-schema.sql`.

### 4.2 Data Export via PostgreSQL / Supabase CLI
```bash
# Export full database schema + data snapshot
pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres > musky_dose_full_dump_$(date +%Y%m%d).sql

# Export schema only
pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres --schema-only > schema_only.sql
```

---

## 5. RECOVERY PLAYBOOKS

### 5.1 Scenario A: Accidental Product or Category Deletion
1. Access Admin Dashboard at `/admin/products` or `/admin/categories`.
2. Check if product was simply marked `is_active = false`. Re-activate if hidden.
3. If permanently deleted, re-insert using `/supabase-schema.sql` seed references or admin form.

### 5.2 Scenario B: Database Server Unavailability
1. Server endpoints in `/lib/server-db.ts` automatically catch database connection failures.
2. The application falls back to the in-memory store in `/lib/data-store.ts`, serving active product pages and allowing continuous WhatsApp order link generation with zero downtime.

---

## 6. ENVIRONMENT VARIABLES SAFETY
| Variable | Description | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server administrative key | **SERVER ONLY (SECRET)** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Contact phone (`918233703080`) | Public |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 ID | Public |
| `NEXT_PUBLIC_SITE_URL` | Canonical host (`https://muskydose.in`) | Public |
