# MUSKY DOSE — DISASTER RECOVERY & BACKUP GUIDE

This document outlines the backup, restoration, and disaster recovery procedures for the **Musky Dose** application platform.

---

## 1. SYSTEM ARCHITECTURE & DATA PERSISTENCE

Musky Dose utilizes a dual-layer data architecture:
1. **Primary Persistence**: Supabase PostgreSQL Database (via Service Role API client on the server).
2. **Fallback Persistence**: In-memory data store hydrated with authentic seed datasets (`/lib/data-store.ts`) whenever the primary database is unreachable.

---

## 2. REQUIRED ENVIRONMENT VARIABLES

The application relies on the following environment variables. **Never commit actual secret values to source control or public logs.**

| Variable Name | Description | Sensitivity |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint URL for the Supabase project | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client API key for Supabase | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative secret key for server-side operations | **SECRET (Server Only)** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Business WhatsApp contact number (Default: `918233703080`) | Public |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional Google Analytics 4 Measurement ID | Public |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (Default: `https://muskydose.in`) | Public |

---

## 3. DATABASE BACKUP & RESTORATION

### 3.1 Schema Definition
The canonical database schema is maintained in version control at `/supabase-schema.sql`.

Included tables:
- `categories`: Product categories, descriptions, images, sort orders.
- `products`: Product catalog, pricing, SKU, images, ingredients, benefits, usage, stock status.
- `orders`: WhatsApp customer order enquiries, item snapshots, status.
- `customers`: Customer records & purchasing history.
- `site_settings`: Brand information, hero content, contact details, SEO metadata.
- `payment_settings`: Payment configuration (`online_payment_enabled` strictly `false`).
- `admin_users`: Administrative user credentials & roles.

### 3.2 Backup Execution (Supabase CLI / PostgreSQL)
If using Supabase CLI or pg_dump:
```bash
# Export full database schema and data
pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres > musky_dose_backup_$(date +%Y%m%d).sql

# Export schema only
pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres --schema-only > schema_backup.sql
```

### 3.3 Restoration Procedure
To restore the database structure and initial seed state on a fresh Supabase project:
1. Connect to the new Supabase project SQL Editor or psql CLI.
2. Execute `/supabase-schema.sql`.
3. Verify that Row Level Security (RLS) is enabled on all tables:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```
4. Verify RLS policies exist for categories, products, orders, site_settings, and admin_users.

---

## 4. STORAGE & ASSET RECOVERY

- **Product & Category Media**: Primary image URLs are stored as high-resolution HTTPS CDN URLs (or Supabase Storage bucket URLs if configured).
- **Fallback Handling**: If a product image fails to load, the frontend falls back gracefully to default branded placeholder assets.

---

## 5. DISASTER SCENARIOS & PLAYBOOKS

### Scenario A: Accidental Product or Category Deletion
1. **Diagnosis**: Product missing from public catalog or admin panel.
2. **Action**: Re-insert the item via the Admin Panel (`/admin/products` or `/admin/categories`) or re-run the seed script in `/lib/data-store.ts`.
3. **Safety Guarantee**: Deleting a category with active attached products is blocked by server-side safeguards in `deleteCategory()`.

### Scenario B: Database Unavailability
1. **Diagnosis**: Supabase connection timeouts or missing environment credentials.
2. **Action**: The server automatically catches connection errors and falls back to `data-store.ts` memory records, ensuring zero downtime for customer browsing and WhatsApp order button clicks.

### Scenario C: Environment Variable Loss
1. **Action**: Refer to `.env.example` in the project root. Re-populate the variables in the host configuration panel (Cloud Run / Vercel / Supabase).
2. **Restart**: Trigger a redeployment or server restart.

---

## 6. POST-RECOVERY VERIFICATION CHECKLIST

After any restoration or disaster recovery event, perform the following strict checks:

- [ ] **WhatsApp Number Verification**: Ensure primary ordering target is `918233703080`.
- [ ] **Payment Safety**: Verify `online_payment_enabled` is set to `false`.
- [ ] **Admin Authentication**: Confirm `/admin/login` and protected routes function correctly.
- [ ] **Product Catalog**: Verify active products render on `/products` and product detail pages.
- [ ] **SEO & Metadata**: Verify canonical URLs target `https://muskydose.in` and `/sitemap.xml` returns valid XML.
- [ ] **Analytics**: Confirm GA4 tracking ID (if set) is firing without errors and excludes `/admin` paths.
