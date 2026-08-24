# 02 — FILE STRUCTURE & ROUTING MAP

This document provides a complete inventory of the repository directory tree, page routes, layouts, and API handlers.

---

## 1. Directory Tree Overview

```
.
├── app/                        # Next.js App Router (Pages, Layouts, API Routes)
│   ├── about/                  # About Us page (/about)
│   ├── admin/                  # Protected Admin Panel (/admin/*)
│   │   ├── bulk-pricing/       # Bulk pricing rules management
│   │   ├── business-content/   # GST, FSSAI, ISO documents management
│   │   ├── categories/         # Category CRUD management
│   │   ├── cms-pages/          # Custom CMS pages manager
│   │   ├── customers/          # Customer CRM and directory
│   │   ├── growth/             # Musky Growth AI Intelligence suite
│   │   │   ├── campaigns/      # Growth campaign tracking
│   │   │   ├── competitors/    # Competitor pricing and observation
│   │   │   ├── data-sources/   # External data sources & sync logs
│   │   │   ├── imports/        # Bulk CSV data import jobs
│   │   │   ├── keywords/       # Keyword intelligence manager
│   │   │   ├── leads/          # Wholesale lead CRM
│   │   │   ├── map/            # India state demand heatmap
│   │   │   ├── markets/        # Regional market demand breakdown
│   │   │   ├── products/       # Product demand matrix
│   │   │   ├── recommendations/# AI strategic growth action items
│   │   │   └── settings/       # Growth scoring weight configuration
│   │   ├── guides/             # Product guides and usage articles
│   │   ├── login/              # Admin login & OTP recovery
│   │   ├── media/              # Media library & file upload manager
│   │   ├── offers/             # Campaign & discount coupon manager
│   │   ├── orders/             # Order fulfillment management
│   │   ├── pages/              # CMS pages routing manager
│   │   ├── payments/           # Payment settings & toggle status
│   │   ├── products/           # Product CRUD & form editor
│   │   ├── seo/                # Global & per-page SEO keyword manager
│   │   ├── settings/           # Website CMS settings & layout controls
│   │   └── wholesale/          # Wholesale enquiry list
│   ├── api/                    # Server API Routes (/api/*)
│   │   ├── admin/              # Protected Admin API routes
│   │   ├── bulk-pricing/       # Bulk pricing API
│   │   ├── business-content/   # Business documents API
│   │   ├── campaigns/          # Campaigns & offers API
│   │   ├── categories/         # Categories API
│   │   ├── coupons/            # Coupon validation API
│   │   ├── custom-pages/       # Custom pages API
│   │   ├── orders/             # Order creation & retrieval API
│   │   ├── products/           # Products API & bulk operations
│   │   ├── settings/           # Site settings API
│   │   └── wholesale/          # Wholesale enquiries API
│   ├── cancellation-policy/    # Cancellation policy page
│   ├── cart/                   # Cart page (/cart)
│   ├── categories/             # Public categories listing & category details
│   ├── checkout/               # WhatsApp order confirmation & form
│   ├── contact/                # Contact Us page
│   ├── documents/              # Certificates, GST, FSSAI verification page
│   ├── factory/                # Sojat Factory & Process page
│   ├── faq/                    # Frequently Asked Questions
│   ├── guides/                 # Herbal guides & knowledge base
│   ├── offers/                 # Special offers & active campaigns page
│   ├── pages/                  # Custom CMS page renderer
│   ├── privacy-policy/         # Privacy policy page
│   ├── products/               # Products catalog & product details page
│   ├── return-policy/          # Return & refund policy page
│   ├── shipping-policy/        # Shipping policy page
│   ├── terms/                  # Terms & conditions page
│   ├── wholesale/              # Wholesale enquiry page
│   ├── wishlist/               # Customer wishlist page
│   ├── globals.css             # Tailwind v4 CSS imports
│   ├── layout.tsx              # Root HTML layout with providers
│   ├── manifest.ts             # Web App Manifest (PWA)
│   ├── not-found.tsx           # Custom 404 page
│   ├── page.tsx                # Homepage
│   ├── robots.ts               # Robots.txt generator
│   └── sitemap.ts              # XML Sitemap generator
├── components/                 # Reusable React UI Components
│   ├── growth/                 # Growth AI UI components
│   ├── AdminLayout.tsx         # Sidebar layout for Admin panel
│   ├── AnalyticsScript.tsx     # Google Analytics & GTM loader
│   ├── BrandLogo.tsx           # PNG Logo renderer with error fallback
│   ├── CartDrawer.tsx          # Slide-out cart drawer
│   ├── CategoryCard.tsx        # Category grid card
│   ├── CategoryTracker.tsx     # Category view tracker
│   ├── CountdownTimer.tsx      # Offer countdown timer
│   ├── CouponInput.tsx         # Checkout coupon input
│   ├── CustomPageRenderer.tsx  # Dynamic CMS page block renderer
│   ├── Footer.tsx              # Public site footer
│   ├── HeroCarousel.tsx        # Homepage hero slider
│   ├── MediaSelectModal.tsx    # Admin media chooser modal
│   ├── MobileBottomNav.tsx     # Mobile bottom sticky navigation
│   ├── Motion.tsx              # Framer Motion component wrappers
│   ├── Navbar.tsx              # Header navigation bar
│   ├── OfferBanner.tsx         # Top announcement & offer banner
│   ├── PolicyPageLayout.tsx    # Policy pages layout wrapper
│   ├── ProductCard.tsx         # Product grid card component
│   ├── Providers.tsx           # Context providers wrapper
│   ├── PwaInstallCTA.tsx       # PWA installation banner
│   ├── TrustStrip.tsx          # Trust badges strip
│   ├── WhatsAppFloat.tsx       # Floating WhatsApp chat button
│   └── WishlistDrawer.tsx      # Slide-out wishlist drawer
├── context/                    # React Context State Managers
│   ├── CartContext.tsx         # Cart item state & local persistence
│   └── WishlistContext.tsx     # Wishlist state & local persistence
├── lib/                        # Core Utilities & Backend Logic
│   ├── growth/                 # Musky Growth AI engine
│   ├── api-client.ts           # Client-side API fetch wrapper
│   ├── api-errors.ts           # Standardized API error responses
│   ├── auth.ts                 # Cryptographic authentication & OTP
│   ├── cms.ts                  # CMS default text data
│   ├── data-store.ts           # Initial default datasets & fallback
│   ├── rate-limit.ts           # Memory rate limiter
│   ├── server-db.ts            # Supabase database query repository
│   ├── supabase.ts             # Supabase client & admin client
│   ├── types.ts                # TypeScript interface definitions
│   ├── utils.ts                # Sanitization & string formatters
│   └── whatsapp.ts             # WhatsApp message generator
├── middleware.ts               # Next.js Route Protection Middleware
├── public/                     # Public Static Assets
│   ├── favicon.png             # Official PNG favicon
│   ├── logo.png                # Official PNG brand logo
│   └── images/                 # Fallback images
└── scripts/                    # Asset & Migration Scripts
```

---

## 2. Comprehensive Route Map

### Public Storefront Routes
| Route Path | File Location | Purpose & Rendering |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | Main Homepage featuring Hero Carousel, Trust Badges, Categories, Best Sellers, Sojat Story, Guides & WhatsApp CTA. |
| `/products` | `app/products/page.tsx` | Product catalog with search, category filtering, sort controls, and grid view. |
| `/products/[slug]` | `app/products/[slug]/page.tsx` | Detailed product view with image gallery, pricing, stock status, ingredient list, usage instructions, related products, and WhatsApp order CTA. |
| `/categories` | `app/categories/page.tsx` | Category listing page displaying Henna, Hair Care, Face Care, and Herbal Collections. |
| `/categories/[slug]` | `app/categories/[slug]/page.tsx` | Filtered product grid for a specific category. |
| `/wholesale` | `app/wholesale/page.tsx` | B2B Wholesale page with bulk pricing information and enquiry form submission. |
| `/guides` | `app/guides/page.tsx` | Educational botanical guides and usage articles. |
| `/guides/[slug]` | `app/guides/[slug]/page.tsx` | Full-length guide page with step-by-step instructions and product recommendations. |
| `/about` | `app/about/page.tsx` | Brand story, Sojat heritage, and corporate mission. |
| `/factory` | `app/factory/page.tsx` | Factory tour detailing shade drying, pulverizing, triple sifting, and vacuum packaging. |
| `/contact` | `app/contact/page.tsx` | Contact details, office address in Sojat, contact form, and direct WhatsApp button. |
| `/faq` | `app/faq/page.tsx` | Frequently Asked Questions accordion. |
| `/documents` | `app/documents/page.tsx` | Official business certificates (GST, FSSAI, ISO 9001, COA Lab Analysis). |
| `/offers` | `app/offers/page.tsx` | Active campaigns, seasonal discounts, and coupon codes. |
| `/cart` | `app/cart/page.tsx` | Full cart view with quantity adjustment, bulk discount breakdown, and checkout CTA. |
| `/wishlist` | `app/wishlist/page.tsx` | Customer saved items list. |
| `/checkout` | `app/checkout/page.tsx` | Delivery address form and pre-filled WhatsApp message generator. |
| `/shipping-policy` | `app/shipping-policy/page.tsx` | Shipping timeframe and delivery charges disclosure. |
| `/return-policy` | `app/return-policy/page.tsx` | Returns, damage claim process, and refund terms. |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Customer data privacy notice. |
| `/terms` | `app/terms/page.tsx` | Website usage and trade terms. |
| `/cancellation-policy` | `app/cancellation-policy/page.tsx` | Order cancellation rules. |

---

### Protected Admin Panel Routes (`/admin/*`)
| Route Path | File Location | Purpose & Functionality |
| :--- | :--- | :--- |
| `/admin/login` | `app/admin/login/page.tsx` | Password login & 6-digit Mobile OTP account recovery. |
| `/admin` | `app/admin/page.tsx` | Core Admin Dashboard with quick metrics, recent orders, and fast action links. |
| `/admin/products` | `app/admin/products/page.tsx` | Products list table with search, filter, publish toggle, and bulk actions. |
| `/admin/products/new` | `app/admin/products/new/page.tsx` | Create new product form. |
| `/admin/products/[id]` | `app/admin/products/[id]/page.tsx` | Edit existing product details. |
| `/admin/categories` | `app/admin/categories/page.tsx` | Category manager (Add, Edit, Reorder, Delete). |
| `/admin/orders` | `app/admin/orders/page.tsx` | Order tracking table (View items, update order/payment status, filter). |
| `/admin/customers` | `app/admin/customers/page.tsx` | Customer CRM directory with order history and total spend. |
| `/admin/wholesale` | `app/admin/wholesale/page.tsx` | Wholesale enquiry submission records. |
| `/admin/offers` | `app/admin/offers/page.tsx` | Campaign & discount coupon configuration. |
| `/admin/bulk-pricing` | `app/admin/bulk-pricing/page.tsx` | Quantity-based tiered discount rules manager. |
| `/admin/guides` | `app/admin/guides/page.tsx` | Product guides & knowledge base CMS. |
| `/admin/media` | `app/admin/media/page.tsx` | Image & media asset upload manager. |
| `/admin/seo` | `app/admin/seo/page.tsx` | SEO metadata & targeted keyword list manager. |
| `/admin/settings` | `app/admin/settings/page.tsx` | Site CMS text editor, layout controls, and business contact settings. |
| `/admin/payments` | `app/admin/payments/page.tsx` | Payment architecture status & mode verification (`online_payment_enabled = false`). |
| `/admin/business-content`| `app/admin/business-content/page.tsx` | Official business certificates (GST, FSSAI, ISO) uploader. |
| `/admin/growth` | `app/admin/growth/page.tsx` | Musky Growth AI main dashboard. |
| `/admin/growth/map` | `app/admin/growth/map/page.tsx` | India state-level demand heatmap. |
| `/admin/growth/markets` | `app/admin/growth/markets/page.tsx` | Regional market demand scoring breakdown. |
| `/admin/growth/leads` | `app/admin/growth/leads/page.tsx` | Wholesale Lead CRM table with follow-up tracking. |
| `/admin/growth/keywords` | `app/admin/growth/keywords/page.tsx` | Search volume & keyword intelligence analytics. |
| `/admin/growth/competitors`| `app/admin/growth/competitors/page.tsx` | Competitor pricing & product observation database. |
| `/admin/growth/data-sources`| `app/admin/growth/data-sources/page.tsx` | External data connectors & sync log monitor. |
| `/admin/growth/recommendations`| `app/admin/growth/recommendations/page.tsx` | AI strategic growth recommendations feed. |

---

### Backend API Handlers (`app/api/*`)
| API Endpoint | Methods | Primary Operation |
| :--- | :--- | :--- |
| `/api/products` | `GET`, `POST` | List active products / Create new product. |
| `/api/products/[id]` | `GET`, `PUT`, `DELETE` | Fetch single product / Update product / Delete product. |
| `/api/products/bulk` | `PUT`, `DELETE` | Bulk publish, unpublish, or delete products. |
| `/api/categories` | `GET`, `POST`, `PUT`, `DELETE` | Category CRUD operations. |
| `/api/orders` | `GET`, `POST` | List orders / Create new customer order. |
| `/api/orders/[id]` | `GET`, `PUT` | Fetch single order / Update order or payment status. |
| `/api/settings` | `GET`, `POST` | Get public site settings / Update admin CMS settings. |
| `/api/wholesale` | `GET`, `POST`, `PUT` | List enquiries / Submit wholesale form / Update status. |
| `/api/coupons/validate`| `POST` | Validate coupon code against active campaigns. |
| `/api/campaigns` | `GET`, `POST`, `PUT`, `DELETE` | Manage campaigns & seasonal offer banners. |
| `/api/bulk-pricing` | `GET`, `POST`, `PUT`, `DELETE` | Quantity discount tier management. |
| `/api/business-content`| `GET`, `POST`, `PUT`, `DELETE` | Certificate document CRUD. |
| `/api/custom-pages` | `GET`, `POST`, `PUT`, `DELETE` | Custom CMS page manager. |
| `/api/admin/auth` | `POST`, `DELETE` | Admin login (cookie creation) / Logout (cookie deletion). |
| `/api/admin/forgot-password`| `POST` | Request 6-digit mobile OTP code. |
| `/api/admin/verify-otp` | `POST` | Verify mobile OTP code & generate reset token. |
| `/api/admin/reset-password`| `POST` | Reset admin password using token. |
| `/api/admin/media` | `GET`, `POST`, `DELETE` | Media library image upload & deletion. |
| `/api/admin/seo-keywords` | `GET`, `POST`, `PUT`, `DELETE` | SEO keywords CRUD. |
| `/api/admin/seo-keywords/import`| `POST` | Bulk import keywords from CSV/JSON. |
| `/api/admin/seo-keywords/export`| `GET` | Export targeted keywords list to CSV. |
| `/api/admin/guides` | `GET`, `POST`, `PUT`, `DELETE` | Product guide CMS operations. |
| `/api/admin/customers` | `GET` | List customer database with metrics. |
| `/api/admin/page-seo` | `GET`, `PUT` | Per-page Meta Title & Description configuration. |
| `/api/admin/growth/*` | `GET`, `POST`, `PUT` | Growth AI endpoints (overview, markets, leads, keywords, competitors, exports, recommendations). |
