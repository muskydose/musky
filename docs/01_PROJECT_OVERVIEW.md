# 01 — PROJECT OVERVIEW & ARCHITECTURE SUMMARY
**Project Name:** Musky Dose  
**Domain:** `muskydose.in`  
**Brand Identity:** Premium Henna & Herbal Products  
**Origin:** Sojat, Pali District, Rajasthan, India  
**Target Audience:** B2C Retail Customers, B2B Wholesale Buyers, Professional Mehendi Artists, Salons & Global Distributors  

---

## 1. Executive Summary
Musky Dose is an autonomous full-stack e-commerce web application built for a premier Indian herbal brand based in Sojat, Rajasthan. Sojat is globally recognized as the "Henna City of India," producing over 90% of India's natural henna with exceptionally high lawsone pigment content.

The application serves dual commercial functions:
1. **D2C Public Storefront:** Direct-to-Consumer retail product catalog where customer orders are placed seamlessly via pre-filled **WhatsApp messages** (`whatsapp_order_enabled = true`).
2. **Enterprise Admin Panel (`/admin`):** Fully integrated administrative back-office supporting dynamic content management (CMS), product & category catalog management, order tracking, customer database, wholesale lead CRM, campaign/coupon engines, SEO keyword management, and **Musky Growth AI** market intelligence.

---

## 2. Core Business Directives & Architectural Constraints

| Directive | Operational State | Architectural Rule |
| :--- | :--- | :--- |
| **Primary Order Method** | **WhatsApp** | Order checkout constructs a structured, pre-filled WhatsApp message sent to the business phone number (`918233703080`). Orders are simultaneously saved to the Supabase database. |
| **Online Payment Gateway** | **DISABLED (`false`)** | Hard-enforced across client UI, server actions, and database mappings. `online_payment_enabled` is locked to `false`. Online payment UI is disabled. Payment gateway parameters are ready in the database schema for future activation. |
| **Brand Assets** | **PNG Only** | Official logo (`/public/logo.png`) and favicon (`/public/favicon.png`) are strictly raster PNG files. Vector conversion (SVG) is explicitly prohibited to preserve original color tones, transparency, and aspect ratios. |
| **Data Persistence** | **Supabase (PostgreSQL) + Fallback** | Primary database is Supabase PostgreSQL using service-role access for admin operations and public read access for active catalog items. If Supabase is unconfigured, system falls back gracefully to in-memory datasets. |
| **Admin Authentication** | **Custom Cryptographic Tokens** | Sessions use signed HMAC-SHA256 tokens stored in HttpOnly cookies (`md_admin_auth`). Passwords are stored using scrypt KDF. Includes a 6-digit mobile OTP recovery system (`admin_otps`). |

---

## 3. Technology Stack

### Frontend Architecture
- **Framework:** Next.js 15.4 (App Router) running on React 19.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) with custom color tokens (Deep Forest Green `#183F2B`, Earthy Olive `#5F7F52`, Terracotta Henna `#9A4F32`, Royal Gold `#C49A55`, Warm Neutral `#F7F3E8`).
- **Icons:** `lucide-react` (0.553.0).
- **Animations:** `motion` (12.23.24) for smooth route transitions and drawer overlays.
- **State Management:** React Context (`CartContext`, `WishlistContext`) with local storage sync.

### Backend & API Architecture
- **API Runtime:** Next.js Server-side API Routes (`app/api/*`).
- **Database:** Supabase PostgreSQL (`@supabase/supabase-js` 2.112.2).
- **ORM / Querying:** Direct Supabase Client + custom SQL schema migrations (`supabase-schema.sql`, `supabase-growth-schema.sql`).
- **AI & Growth:** `@google/genai` (2.4.0) for server-side Gemini AI content and market intelligence generation.
- **Image Processing:** `sharp` (0.35.3) & `@resvg/resvg-js` (2.6.2) for asset optimization and PWA icon generation.

---

## 4. Key Metrics & Capability Summary
- **Public Pages:** 21 routes (Home, Products, Product Detail, Categories, Wholesale, About, Factory, Contact, FAQ, Cart, Wishlist, Documents, Policy pages, Offers).
- **Admin Pages:** 16 routes (Dashboard, Products, Categories, Orders, Customers, Settings, Payments, Wholesale, Guides, Growth AI sub-modules, Media Library, SEO, Bulk Pricing, Custom Pages, Business Content).
- **API Endpoints:** 37 server API handlers (`app/api/...`).
- **Database Tables:** 26 tables total (14 Core E-Commerce tables + 12 Growth AI tables).
- **Security Protocols:** Signed HMAC-SHA256 session tokens, timing-safe string comparisons, CSRF origin checks, scrypt password hashing, and rate limiting (5 attempts / 15 mins).
