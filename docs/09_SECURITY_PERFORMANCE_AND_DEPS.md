# 09 — SECURITY, PERFORMANCE & DEPENDENCY ANALYSIS

This document details application security hardening, cryptographic session validation, rate limiting, performance optimizations, and npm dependency management.

---

## 1. Application Security Architecture

### Authentication Hardening (`lib/auth.ts` & `middleware.ts`)
- **Session Tokens:** Admin auth cookies (`md_admin_auth`) are cryptographically signed using HMAC-SHA256 with `ADMIN_SESSION_SECRET`.
- **Token Structure:** `v1.<timestamp>.<nonce>.<emailHex>.<signature>`
- **Timing-Safe Equality:** Signature comparisons use `crypto.timingSafeEqual()` to eliminate timing attack vectors.
- **Cookie Security Flags:**
  - `HttpOnly: true` (Prevents XSS token theft via client JavaScript).
  - `SameSite: Lax` (Protects against Cross-Site Request Forgery).
  - `Path: /`
  - `MaxAge: 604800` (7 days expiration).
- **Failure-Closed Protection:** Middleware automatically redirects any request lacking a valid, unexpired HMAC signature to `/admin/login`.

### Password & OTP Hashing
- **Scrypt Key Derivation:** Passwords are hashed using Node.js native `crypto.scryptSync()` with a 16-byte random salt and 64-byte key length.
- **OTP Verification:** Mobile 6-digit recovery codes are hashed using SHA-256 before storage in the `admin_otps` table. OTP entries expire strictly after 10 minutes and self-destruct after 3 incorrect attempts.

### Rate Limiting (`lib/rate-limit.ts`)
- Implements an in-memory sliding window rate limiter for login and password recovery endpoints:
  - Max **5 login attempts per 15 minutes** per IP address.
  - Automatically returns `429 Too Many Requests` when threshold is exceeded.

### Input Sanitization & XSS Prevention (`lib/utils.ts`)
- All user text inputs (names, addresses, enquiries, review text) are sanitized using regular expressions to strip HTML tags (`<script>`, `<iframe>`, `javascript:`, `onerror=`) before database persistence.

---

## 2. Performance Optimizations

### Next.js App Router Caching & Rendering
- **Server Components:** Public pages (`app/page.tsx`, `app/products/page.tsx`, `app/categories/page.tsx`) leverage Server Components for zero-bundle-size rendering of initial HTML.
- **Image Optimization:** Uses Next.js `<Image>` component with responsive `sizes` attributes, WebP automatic format conversion, and explicit width/height parameters to avoid Cumulative Layout Shift (CLS).
- **Bundle Splitting:** Heavy interactive modules (e.g., Growth AI charts, Admin Product Editor, Custom Page Builder) are dynamically loaded via React dynamic imports to keep initial JavaScript payload minimal.
- **CSS Efficiency:** Uses Tailwind CSS v4 `@tailwindcss/postcss` compiler for streamlined, utility-first CSS output without unused style bloat.

---

## 3. Dependency Inventory & Package Audit

Below is a complete audit of installed production and development dependencies in `package.json`:

### Production Dependencies (`dependencies`)
| Package Name | Version | Architectural Purpose |
| :--- | :--- | :--- |
| `next` | `15.4.1` | Next.js Core App Router framework. |
| `react` | `19.0.0` | React core library. |
| `react-dom` | `19.0.0` | React DOM renderer. |
| `@supabase/supabase-js` | `^2.112.2` | Official Supabase PostgreSQL client SDK. |
| `@google/genai` | `^2.4.0` | Google Gemini AI SDK for server-side growth intelligence. |
| `lucide-react` | `^0.553.0` | Production vector icons library. |
| `motion` | `^12.23.24` | Animation engine for drawers and page transitions. |
| `clsx` | `^2.1.1` | Utility for constructing conditional classNames. |
| `tailwind-merge` | `^3.0.2` | Utility to merge Tailwind CSS classes without specificity conflicts. |
| `sharp` | `^0.33.5` | High-performance image processing engine. |
| `@resvg/resvg-js` | `^2.6.2` | SVG to PNG rendering engine for PWA asset generation. |

### Development Dependencies (`devDependencies`)
| Package Name | Version | Architectural Purpose |
| :--- | :--- | :--- |
| `typescript` | `^5` | Static type checking. |
| `@types/node` | `^20` | TypeScript definitions for Node.js. |
| `@types/react` | `^19` | TypeScript definitions for React. |
| `@types/react-dom` | `^19` | TypeScript definitions for React DOM. |
| `@tailwindcss/postcss` | `^4.0.0` | PostCSS plugin for Tailwind CSS v4 compiler. |
| `tailwindcss` | `^4.0.0` | Tailwind CSS v4 engine. |
| `postcss` | `^8` | PostCSS tool for transforming CSS. |
| `eslint` | `^9` | JavaScript and TypeScript linting suite. |
| `eslint-config-next` | `15.4.1` | Next.js ESLint configuration rules. |

---

## 4. Environment Variables Specification (`.env.example`)

| Variable Name | Environment Scope | Required / Optional | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Required for DB | Supabase project URL (`https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Required for DB | Supabase public anonymous API key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | Required for DB | Supabase admin service role key (bypasses RLS). |
| `ADMIN_SESSION_SECRET` | Server-Only | Required for Auth | Secret key used for signing HMAC-SHA256 session tokens. |
| `SMS_GATEWAY_API_KEY` | Server-Only | Optional | API key for mobile OTP SMS delivery gateway. |
| `GEMINI_API_KEY` | Server-Only | Optional | Google Gemini AI API key for Growth AI features. |
