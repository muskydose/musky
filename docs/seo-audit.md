# Musky Dose — SEO Technical & Intelligence Audit

**Audit Date:** September 18, 2026  
**Status:** FULLY COMPLIANT & REINFORCED  
**Primary Domain:** `https://muskydose.in`  
**Target Market:** India-First & Global Direct Botanical Sourcing

---

## 1. Executive Summary

This document provides the authoritative technical and algorithmic audit of the search engine optimization (SEO) architecture and SEO Intelligence Layer in Musky Dose.

The website operates an organic, free-first SEO infrastructure designed to capture high-intent botanical, wholesale, and ayurvedic search traffic without reliance on paid keyword APIs or external SEO subscriptions.

---

## 2. Google Search Console & Data Ingestion

### 2.1 Architecture
- **Adapter**: `SearchConsoleDataSourceAdapter` located in `lib/growth/adapters/search-console.ts`.
- **Database Table**: `growth_gsc_snapshots` storing query, canonical page, country (`IND`), impressions, clicks, CTR, average position, and snapshot date.
- **Fail-Safe Behavior**:
  - If Google Search Console API credentials (`GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`, etc.) are not configured, the ingestion system gracefully returns `isAvailable: false` with status `"Google Search Console API credentials not configured in environment."`.
  - The site never throws unhandled rejections or crashes during cron execution.
  - Catalog and entity graph audits automatically continue functioning to detect metadata gaps and orphan pages.

### 2.2 7-Day Rolling Delta Math
The comparison engine evaluates the latest 7-day window against the immediately preceding 7-day window:
$$\Delta_{\text{clicks}} = \text{Clicks}_{\text{current 7d}} - \text{Clicks}_{\text{previous 7d}}$$
$$\Delta_{\text{impressions}} = \text{Impressions}_{\text{current 7d}} - \text{Impressions}_{\text{previous 7d}}$$
$$\Delta_{\text{CTR}} = \text{CTR}_{\text{current 7d}} - \text{CTR}_{\text{previous 7d}}$$
$$\Delta_{\text{position}} = \text{Position}_{\text{current 7d}} - \text{Position}_{\text{previous 7d}}$$
- Directional indicators highlight top positive and negative query movers without statistical noise.

---

## 3. Search Intent Classification Engine

### 3.1 Precedence Hierarchy
To prevent geographical city terms (`sojat`, `rajasthan`, `india`) from masking actionable user purchase or learning intent, the deterministic classifier enforces the following strict order:

```text
1. WHOLESALE        -> (bulk, b2b, supplier, manufacturer, distributor, export, ton, quintal, kg price)
2. NAVIGATIONAL      -> (musky, muskydose)
3. TRANSACTIONAL     -> (buy, order, price, purchase, cost, discount, shop, online, coupon)
4. INFORMATIONAL     -> (how to, what is, why does, recipe, preparation, steps, guide, tutorial, benefits)
5. COMMERCIAL        -> (best, vs, review, top, grade, quality, comparison, certified)
6. LOCAL / SOURCING  -> (near me, store in, shop in, in delhi, in jaipur, sojat, rajasthan, mandi)
```

### 3.2 Mixed-Intent Query Validation Matrix

| Test Query | Expected Intent | Classifier Output | Validation Status |
| :--- | :---: | :---: | :---: |
| `sojat henna wholesale supplier` | `WHOLESALE` | `WHOLESALE` | ✅ PASS |
| `bulk indigo powder kg price` | `WHOLESALE` | `WHOLESALE` | ✅ PASS |
| `buy sojat henna powder` | `TRANSACTIONAL` | `TRANSACTIONAL` | ✅ PASS |
| `buy natural henna powder online` | `TRANSACTIONAL` | `TRANSACTIONAL` | ✅ PASS |
| `natural henna price india` | `TRANSACTIONAL` | `TRANSACTIONAL` | ✅ PASS |
| `how to use sojat henna` | `INFORMATIONAL` | `INFORMATIONAL` | ✅ PASS |
| `how to mix henna and indigo for black hair`| `INFORMATIONAL` | `INFORMATIONAL` | ✅ PASS |
| `best organic amla powder review` | `COMMERCIAL` | `COMMERCIAL` | ✅ PASS |
| `musky dose sojat henna` | `NAVIGATIONAL` | `NAVIGATIONAL` | ✅ PASS |
| `musky dose customer support` | `NAVIGATIONAL` | `NAVIGATIONAL` | ✅ PASS |
| `pure sojat henna rajasthan` | `LOCAL` | `LOCAL` | ✅ PASS |

---

## 4. Deterministic Opportunity Detection Engine

The SEO Intelligence Layer systematically scans for 10 canonical opportunity archetypes:

1. **`CTR_IMPROVEMENT`**: Impressions $\ge 40$, Average Position $\le 10.0$ (Page 1), CTR $< 3.0\%$. Recommends intent-aligned title/description refactoring.
2. **`RANKING_IMPROVEMENT`**: Average Position between $4.0$ and $20.0$, Impressions $\ge 25$. Recommends content depth expansion and H2 semantic enhancement.
3. **`DECLINING_PAGE`**: Multi-snapshot drop in impressions or clicks $\ge 30\%$. Flagged as **`requiresApproval: true`** to protect canonical copy.
4. **`NEW_KEYWORD_OPPORTUNITY`**: Newly discovered queries with rising impressions without dedicated ranking URLs.
5. **`CONTENT_GAP`**: High-intent wholesale and botanical education queries unserved by the existing catalog. Requires owner approval to draft.
6. **`INTERNAL_LINK_OPPORTUNITY`**: Catalog products or knowledge entities not linked in any ritual guide (orphan elimination).
7. **`PRODUCT_SEO_OPPORTUNITY`**: Catalog products missing meta titles (50–60 chars), meta descriptions (140–160 chars), or rich media schema.
8. **`SEARCH_INTENT_MISMATCH`**: Pages ranking for informational queries that lack instructional content or FAQs.
9. **`LOCAL_INTENT_OPPORTUNITY`**: Rajasthani farm-direct provenance and wholesale sourcing queries.
10. **`WHOLESALE_INTENT_OPPORTUNITY`**: B2B, salon, and bulk export queries mapped to `/wholesale`.

---

## 5. Robots, Indexability & Technical Architecture

### 5.1 Robots.txt Rules (`app/robots.ts`)
```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
Disallow: /api/analytics
Disallow: /cart
Disallow: /checkout
Disallow: /wishlist

Sitemap: https://muskydose.in/sitemap.xml
```

### 5.2 Explicit Indexability (`robots.txt != noindex`)
To prevent indexation if a crawler bypasses `robots.txt` or follows external links, explicit `robots` metadata is applied at the page/layout level:
- `/checkout`: Controlled by `app/checkout/layout.tsx` $\to$ `<meta name="robots" content="noindex, nofollow" />`.
- `/cart`: Controlled by `app/cart/page.tsx` $\to$ `<meta name="robots" content="noindex, nofollow" />`.
- `/wishlist`: Controlled by `app/wishlist/page.tsx` $\to$ `<meta name="robots" content="noindex, nofollow" />`.
- `/admin/*`: Controlled by `app/admin/layout.tsx` $\to$ `<meta name="robots" content="noindex, nofollow, nocache" />`.

### 5.3 Structured Data & JSON-LD
- **Product Schema**: Generates Schema.org `Product` with `Offer`, `MerchantReturnPolicy`, `OfferShippingDetails`, and `BreadcrumbList`. Zero fabricated reviews or aggregate ratings.
- **Organization Schema**: Truthful brand metadata anchored in Sojat, Rajasthan.
- **Sitemap**: Dynamic XML sitemap at `/sitemap.xml` with priority hierarchy:
  - Homepage: 1.0 (daily)
  - `/products`, `/sojat-henna`: 0.9 (daily)
  - `/wholesale`, `/guides`, `/documents`: 0.85 (weekly)
  - `/categories`, `/faq`: 0.8 (weekly)
  - Static policies & about: 0.5–0.7 (monthly)

