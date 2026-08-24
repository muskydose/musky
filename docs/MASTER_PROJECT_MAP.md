# MUSKY DOSE — MASTER PROJECT MAP & AUDIT INDEX
**Domain:** `muskydose.in`  
**Brand Identity:** Premium Henna & Herbal Products (Sojat, Rajasthan, India)  
**Document Classification:** Technical Architecture & System Audit Index  

---

## 1. Audit Deliverables Directory

This master map indexes the complete 10-part technical audit report generated for the Musky Dose web platform. Each document provides detailed architectural analysis for senior software architects, database administrators, and technical project managers.

```
/docs
├── 01_PROJECT_OVERVIEW.md           # Executive Summary, Tech Stack, Key Directives
├── 02_FILE_STRUCTURE_AND_ROUTES.md  # Directory Inventory, Route Table, API Map
├── 03_CUSTOMER_FLOWS_AND_UI.md      # Design System, Storefront UX, Drawers, Components
├── 04_ADMIN_SYSTEM_AND_CMS.md       # Admin Auth, HMAC Sessions, OTP, CMS Settings
├── 05_DATABASE_AND_SUPABASE.md      # Supabase Schema (26 Tables), RLS, RPCs, Fallbacks
├── 06_GROWTH_AI_AND_ANALYTICS.md    # Musky Growth AI Suite, Scoring Model, Lead CRM
├── 07_ORDER_AND_PAYMENT_SYSTEM.md   # WhatsApp Ordering, Payment OFF Rule, Order Status
├── 08_SEO_BRANDING_AND_ASSETS.md    # PNG Branding Rules, SEO Metadata, Schema.org, Sitemap
├── 09_SECURITY_PERFORMANCE_AND_DEPS.md # Crypto Auth, Rate Limits, Dependencies, Env Vars
├── 10_MASTER_STATUS.md              # 38-Point Audit Scorecard, Health Matrix, Deployment
└── MASTER_PROJECT_MAP.md            # Master Index & Cross-Reference Map
```

---

## 2. Summary of Key Architectural Audit Findings

### A. Core Architecture & Stack
- **Framework:** Next.js 15.4 (App Router) with React 19 and Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Database:** Supabase PostgreSQL with 26 total tables (14 Core E-Commerce + 12 Growth AI). Service-role server queries bypass RLS for administrative access. Memory fallback store (`lib/data-store.ts`) prevents downtime if DB credentials are absent.
- **Icons & Motion:** `lucide-react` for icons and `motion` for UI drawer transitions.

### B. Business & Operational Rules
- **Primary Ordering Channel:** **WhatsApp Ordering** (`whatsapp_order_enabled = true`). Orders construct pre-filled WhatsApp messages (`https://wa.me/918233703080`) while persisting transactions to the Supabase database.
- **Online Payment Status:** **DISABLED (`false`)**. `online_payment_enabled` is hard-enforced to `false` in schema and code. All online payment UI elements are suppressed.
- **Brand Assets:** Official logo (`/public/logo.png`) and favicon (`/public/favicon.png`) are strictly raster PNG files. Vector conversion (SVG) is explicitly prohibited.

### C. Security & Authentication
- **Admin Session Auth:** Cryptographically signed HMAC-SHA256 session tokens stored in HttpOnly cookies (`md_admin_auth`).
- **Password KDF:** Passwords hashed using scrypt algorithm with random salt.
- **OTP Recovery:** 6-digit Mobile OTP account recovery system (`admin_otps` table) with 10-minute expiration and 3-attempt limit.

### D. Musky Growth AI Suite
- Integrated market intelligence engine (`/admin/growth`) evaluating demand across India's 28 states and 8 union territories using a 6-factor weighted Opportunity Scoring algorithm.
