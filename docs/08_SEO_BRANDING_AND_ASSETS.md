# 08 — SEO, BRANDING & ASSETS MANAGEMENT

This document details technical SEO implementation, structured schema markup, OpenGraph tags, sitemap/robots generation, and official brand asset rules.

---

## 1. Official Brand Assets & PNG Rules

### Strict Branding Policy
1. **Asset File Formats:** The brand logo (`/public/logo.png`) and site favicon (`/public/favicon.png`) are strictly maintained as **raster PNG files**.
2. **Prohibition on Vectorization:** Vector conversion (SVG), redrawing, tracing, or color alteration is strictly forbidden. The original PNG appearance, proportions, transparency, and rich natural tones must be preserved.
3. **Placements:**
   - **Header & Mobile Nav:** `components/BrandLogo.tsx` renders `/logo.png`.
   - **Footer:** Renders `/logo.png`.
   - **Favicon & Apple Touch Icon:** `app/layout.tsx` metadata configures `/favicon.png` and `/apple-touch-icon.png`.
4. **Asset Build Script (`scripts/build-assets.mjs`):** Script that verifies image file existence, dimensions, and transparency in `/public`.

---

## 2. Technical SEO Architecture

### Dynamic Metadata & OpenGraph (`app/layout.tsx` & Page Headings)
Next.js 15 Metadata API is configured across all public pages to generate rich search engine previews:

```ts
export const metadata: Metadata = {
  title: {
    default: 'Musky Dose | Pure Sojat Henna & Organic Herbal Products',
    template: '%s | Musky Dose',
  },
  description: '100% pure, unadulterated Lawsonia Inermis Henna powder & organic botanical care directly from Sojat, Rajasthan, India.',
  keywords: [
    'sojat henna powder',
    'pure rajasthani mehendi',
    'natural indigo powder',
    'wholesale henna manufacturer sojat',
    'triple shifted mehendi powder',
  ],
  authors: [{ name: 'Musky Dose Enterprise', url: 'https://muskydose.in' }],
  creator: 'Musky Dose',
  publisher: 'Musky Dose Enterprise',
  formatDetection: { email: false, address: false, telephone: false },
  metadataBase: new URL('https://muskydose.in'),
  openGraph: {
    title: 'Musky Dose | Pure Sojat Henna & Organic Herbal Products',
    description: '100% pure Lawsonia Inermis Henna & botanical hair and skin remedies directly from Sojat, Rajasthan.',
    url: 'https://muskydose.in',
    siteName: 'Musky Dose',
    images: [{ url: '/logo.png', width: 500, height: 500, alt: 'Musky Dose Sojat Henna' }],
    locale: 'en_IN',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
  },
};
```

---

## 3. Structured Data (Schema.org)
JSON-LD structured data is embedded across key templates:
- **`Organization` Schema (`app/layout.tsx`):** Identifies Musky Dose Enterprise, Sojat address, official phone number (`+91 82337 03080`), and social profiles.
- **`Product` Schema (`app/products/[slug]/page.tsx`):** Provides Google Rich Snippets with Product Name, SKU, Image, Description, Brand (`Musky Dose`), Price (`INR`), and Stock Availability (`InStock`).
- **`BreadcrumbList` Schema:** Provides structured site hierarchy for search engines.

---

## 4. Sitemap & Robots Generation

### Sitemap Generator (`app/sitemap.ts`)
Dynamically generates XML sitemap including all public static routes (`/`, `/products`, `/categories`, `/wholesale`, `/about`, `/factory`, `/contact`, `/faq`, `/documents`, `/offers`) plus dynamic product URLs (`/products/[slug]`), category URLs (`/categories/[slug]`), and guide URLs (`/guides/[slug]`):
```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://muskydose.in';
  const products = await getProducts();
  const categories = await getCategories();
  ...
  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
```

### Robots Generator (`app/robots.ts`)
Configures search engine crawlers:
- **Allowed:** All public storefront routes (`/`, `/products/*`, `/categories/*`, `/wholesale`, `/about`, `/factory`, `/contact`, `/guides/*`).
- **Disallowed:** All administrative routes (`/admin/*`) and API endpoints (`/api/*`).
- **Sitemap Link:** Points directly to `https://muskydose.in/sitemap.xml`.

---

## 5. SEO Keywords Manager (`/admin/seo`)
Admin interface for tracking target search keywords stored in the `seo_keywords` table:
- Supports targeting by URL type (`homepage`, `category`, `product`, `wholesale`, `guide`).
- Tracks keyword priority (`HIGH`, `MEDIUM`, `LOW`), primary status, and search intent notes.
- Features CSV export (`/api/admin/seo-keywords/export`) and CSV import (`/api/admin/seo-keywords/import`).
