# 04 — ADMIN SYSTEM, AUTHENTICATION & CMS

This document details the administrative management suite, authentication architecture, security controls, and dynamic content management engines.

---

## 1. Admin Authentication Architecture

### Authentication Mechanism (`lib/auth.ts` & `middleware.ts`)
The admin system is protected by a multi-layered cryptographic authentication engine:

```
[ Admin Login Request (/admin/login) ]
                  │
                  ▼
[ verifyAdminCredentials(email, password) ]
  1. Checks Rate Limiter (Max 5 attempts / 15 mins per IP)
  2. Queries Supabase 'admin_users' table for scrypt password hash
  3. Validates password using scrypt or HMAC timing-safe comparison
  4. Generates signed session token: v1.<timestamp>.<nonce>.<emailHex>.<signature>
                  │
                  ▼
[ setAdminAuthCookie(response, token) ]
  - Sets HttpOnly, SameSite=Lax cookie: 'md_admin_auth'
  - Valid for 7 days (604,800 seconds)
```

### Route Protection Middleware (`middleware.ts`)
```ts
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const authCookie = request.cookies.get('md_admin_auth')?.value;
    if (!verifyAdminSessionToken(authCookie)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  return NextResponse.next();
}
```

---

## 2. Admin Password Recovery System (6-Digit Mobile OTP)
In case of forgotten credentials, a secure 6-digit Mobile OTP engine is implemented in `lib/auth.ts` and managed via `/api/admin/forgot-password`, `/api/admin/verify-otp`, and `/api/admin/reset-password`:

1. **OTP Generation:** Cryptographically generated 6-digit numeric code.
2. **Persistence:** Hashed using SHA-256 and stored in the `admin_otps` table in Supabase with a 10-minute expiration timestamp and 3-attempt limit.
3. **SMS Delivery:** Integrated with SMS Gateway provider using `SMS_GATEWAY_API_KEY`. If SMS gateway credentials are not set, the API safely returns `PROVIDER_REQUIRED`.
4. **Token Exchange:** Upon successful OTP verification, a single-use signed Reset Authorization Token (`reset.v1.<timestamp>.<nonce>.<mobileHex>.<signature>`) is generated.
5. **Password Update:** Updating the password persists the new scrypt hash directly to `admin_users` in Supabase and revokes all active admin session tokens.

---

## 3. Admin Panel Structure & Layout (`components/AdminLayout.tsx`)

The admin panel features a dedicated sidebar navigation layout with active route highlighting:

- **Dashboard (`/admin`)** — Quick stats overview (Total Orders, Products, Customers, Active Offers).
- **Products (`/admin/products`)** — Full product catalog CRUD.
- **Categories (`/admin/categories`)** — Category manager.
- **Orders (`/admin/orders`)** — Order fulfillment tracker with status update dropdowns.
- **Customers (`/admin/customers`)** — Customer database with purchase history.
- **Wholesale (`/admin/wholesale`)** — B2B wholesale enquiries manager.
- **Offers & Coupons (`/admin/offers`)** — Campaign manager & discount code creator.
- **Bulk Pricing (`/admin/bulk-pricing`)** — Tiered quantity discount rules manager.
- **Guides (`/admin/guides`)** — Herbal guide & article CMS.
- **Media Library (`/admin/media`)** — Image uploader and asset chooser.
- **SEO Manager (`/admin/seo`)** — Targeted keywords list & per-page SEO metadata editor.
- **Website Settings (`/admin/settings`)** — CMS text editor, layout controls, and contact details.
- **Business Documents (`/admin/business-content`)** — Official certificates (GST, FSSAI, ISO).
- **Payment Settings (`/admin/payments`)** — Payment architecture controls (`online_payment_enabled = false`).
- **Musky Growth AI (`/admin/growth`)** — Market intelligence & demand analytics suite.

---

## 4. CMS & Dynamic Content Controls

### Site Settings CMS (`lib/server-db.ts` & `lib/data-store.ts`)
The entire public storefront content is configurable through the admin panel without modifying source code. Settings are stored in the `site_settings` table in Supabase:

- **Brand Identity:** Brand Name, Business Name, Tagline, Logo URL (`/logo.png`), Favicon URL (`/favicon.png`).
- **Contact Info:** Display Phone (`+91 82337 03080`), WhatsApp Number (`918233703080`), Email (`info@muskydose.in`), Sojat Complex Address.
- **WhatsApp Templates:** Fully editable order and wholesale message templates with variable placeholders (`{orderNumber}`, `{customerName}`, `{products}`, `{total}`).
- **Homepage Sections & Layout Controls:**
  - Section toggles (Enable/Disable Hero, Trust Strip, Best Sellers, Categories, Why Musky Dose, Sojat Story, Guides, Customer Reviews, Wholesale Banner, WhatsApp CTA).
  - Drag-and-drop / sort order reordering of homepage sections.
  - Fine-grained Layout Controls: Logo widths (mobile/desktop), container max width, heading font scales, grid column counts (mobile/desktop), and card padding.
- **CMS Text Overrides (`CmsTextEditor.tsx`):**
  - Custom text overrides for buttons, form labels, hero headings, section subheadings, policy texts, and trust badges.
