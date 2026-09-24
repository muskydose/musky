/**
 * MUSKY DOSE — SINGLE CANONICAL PRODUCT LIFECYCLE & VISIBILITY GOVERNANCE
 * 
 * Mandate:
 * ONE CENTRAL PRODUCT LIFECYCLE RULE.
 * Public visibility, catalog visibility, purchase availability, URL availability,
 * and SEO indexing are determined centrally and consistently by this engine.
 * 
 * Absolutely NO duplicate or conflicting lifecycle rules across:
 * - Product database access (lib/db/products.ts)
 * - Product route & metadata (app/products/[slug]/page.tsx)
 * - XML Sitemap (app/sitemap.ts)
 * - Robots / noindex (lib/db/seo.ts)
 * - Catalog listings (app/products/page.tsx)
 * - Category pages (app/categories/[slug]/page.tsx)
 * - Related products (lib/db/products.ts)
 * - Cart, Buy Now & Checkout (app/api/orders/route.ts, lib/db/orders.ts)
 * - Product feeds (lib/growth/merchant-feed.ts)
 * - Admin controls (app/admin/products/*)
 */

import { Product } from '@/lib/types';

export type ProductLifecycleStatus =
  | 'ACTIVE'
  | 'HIDDEN'
  | 'DISCONTINUED'
  | 'DRAFT';

export interface ProductLifecycleDecision {
  /** Authoritative product lifecycle status */
  status: ProductLifecycleStatus;

  /**
   * PDP URL accessibility:
   * - true for ACTIVE and HIDDEN (PDP returns HTTP 200)
   * - false for DRAFT (HTTP 404) and DISCONTINUED (HTTP 301 or 404)
   */
  isUrlAccessible: boolean;

  /** Authoritative HTTP response status for the PDP route */
  httpStatus: 200 | 301 | 404 | 410;

  /**
   * Authoritative redirect target if applicable.
   * Only populated when status === 'DISCONTINUED' with an explicit replacement slug.
   */
  redirectTarget?: string;

  /**
   * Public catalog listing visibility:
   * Only ACTIVE products appear on /products, category pages, and homepage feeds.
   * HIDDEN, DRAFT, and DISCONTINUED products are strictly excluded.
   */
  isCatalogVisible: boolean;

  /** Search index storefront visibility */
  isSearchVisible: boolean;

  /** Related products recommendation visibility */
  isRelatedProductsVisible: boolean;

  /** Homepage featured section eligibility: must be ACTIVE and have isFeatured === true */
  isFeaturedEligible: boolean;

  /**
   * Purchasing & Commerce eligibility:
   * Only ACTIVE products with stock !== 'out_of_stock' may be ordered.
   * HIDDEN products can NEVER be purchased via cart, buy-now, direct checkout, or API.
   */
  isPurchasable: boolean;

  /** SEO Indexability: Only ACTIVE products without explicit noindex are indexable */
  isIndexable: boolean;

  /** Robots meta directive: 'index' for active/indexable, 'noindex' for hidden/draft/discontinued */
  robotsIndex: 'index' | 'noindex';

  /**
   * Robots follow directive:
   * 'follow' for both ACTIVE and HIDDEN (preserves link equity while blocking SERP indexing)
   */
  robotsFollow: 'follow' | 'nofollow';

  /** XML sitemap inclusion: Only ACTIVE & indexable products are included */
  isSitemapEligible: boolean;

  /** Google Merchant & Shopping feed inclusion: Only ACTIVE & indexable products */
  isMerchantFeedEligible: boolean;

  /** Customer-facing badge for PDP display */
  publicBadge?: string;

  /** Customer-facing explanatory notice for PDP display */
  publicNotice?: string;
}

/**
 * Normalizes input product data to resolve its authoritative lifecycle status.
 */
export function normalizeProductLifecycleStatus(
  product: Partial<Product> | null | undefined
): ProductLifecycleStatus {
  if (!product || !product.id) {
    return 'DRAFT';
  }

  const rawStatus = (
    product.lifecycleStatus ||
    (product as any).lifecycle_status ||
    ''
  ).toString().toUpperCase();

  // 1. Explicit DISCONTINUED state
  if (rawStatus === 'DISCONTINUED' || (product as any).isDiscontinued === true) {
    return 'DISCONTINUED';
  }

  // 2. Explicit DRAFT state
  if (rawStatus === 'DRAFT' || (product as any).isDraft === true) {
    return 'DRAFT';
  }

  // 3. Explicit HIDDEN state or legacy isActive === false
  if (rawStatus === 'HIDDEN' || product.isActive === false) {
    return 'HIDDEN';
  }

  // 4. Default to ACTIVE for published products
  return 'ACTIVE';
}

/**
 * Universal Authoritative Product Lifecycle Resolver.
 * Single source of truth for all lifecycle, visibility, SEO, and commerce decisions.
 */
export function resolveProductLifecycle(
  product: Partial<Product> | null | undefined
): ProductLifecycleDecision {
  // Case 0: Null or unpersisted product -> 404 Draft
  if (!product || !product.id) {
    return {
      status: 'DRAFT',
      isUrlAccessible: false,
      httpStatus: 404,
      isCatalogVisible: false,
      isSearchVisible: false,
      isRelatedProductsVisible: false,
      isFeaturedEligible: false,
      isPurchasable: false,
      isIndexable: false,
      robotsIndex: 'noindex',
      robotsFollow: 'nofollow',
      isSitemapEligible: false,
      isMerchantFeedEligible: false,
    };
  }

  const status = normalizeProductLifecycleStatus(product);

  // Case 1: DRAFT (Never published / in-progress product)
  if (status === 'DRAFT') {
    return {
      status: 'DRAFT',
      isUrlAccessible: false,
      httpStatus: 404,
      isCatalogVisible: false,
      isSearchVisible: false,
      isRelatedProductsVisible: false,
      isFeaturedEligible: false,
      isPurchasable: false,
      isIndexable: false,
      robotsIndex: 'noindex',
      robotsFollow: 'nofollow',
      isSitemapEligible: false,
      isMerchantFeedEligible: false,
      publicNotice: 'This product draft is private and not published.',
    };
  }

  // Case 2: DISCONTINUED (Permanently retired product)
  if (status === 'DISCONTINUED') {
    const rawReplacement = (product as any).replacementSlug || (product as any).replacement_slug;
    const replacementSlug = typeof rawReplacement === 'string' ? rawReplacement.trim() : undefined;

    if (replacementSlug) {
      return {
        status: 'DISCONTINUED',
        isUrlAccessible: false,
        httpStatus: 301,
        redirectTarget: `/products/${replacementSlug}`,
        isCatalogVisible: false,
        isSearchVisible: false,
        isRelatedProductsVisible: false,
        isFeaturedEligible: false,
        isPurchasable: false,
        isIndexable: false,
        robotsIndex: 'noindex',
        robotsFollow: 'follow',
        isSitemapEligible: false,
        isMerchantFeedEligible: false,
        publicNotice: 'This product has been permanently discontinued and replaced.',
      };
    }

    return {
      status: 'DISCONTINUED',
      isUrlAccessible: false,
      httpStatus: 404,
      isCatalogVisible: false,
      isSearchVisible: false,
      isRelatedProductsVisible: false,
      isFeaturedEligible: false,
      isPurchasable: false,
      isIndexable: false,
      robotsIndex: 'noindex',
      robotsFollow: 'nofollow',
      isSitemapEligible: false,
      isMerchantFeedEligible: false,
      publicNotice: 'This product has been permanently retired.',
    };
  }

  // Case 3: HIDDEN (Temporarily Catalog-Hidden by owner)
  if (status === 'HIDDEN') {
    return {
      status: 'HIDDEN',
      isUrlAccessible: true, // HTTP 200 on direct PDP URL
      httpStatus: 200,
      isCatalogVisible: false, // Hidden from /products, categories, search, related
      isSearchVisible: false,
      isRelatedProductsVisible: false,
      isFeaturedEligible: false,
      isPurchasable: false, // Cannot be added to cart or checked out
      isIndexable: false, // Must not appear in SERPs
      robotsIndex: 'noindex',
      robotsFollow: 'follow', // Retains internal link equity
      isSitemapEligible: false, // Excluded from XML sitemap
      isMerchantFeedEligible: false, // Excluded from Google Shopping / Merchant feeds
      publicBadge: 'Currently Unavailable',
      publicNotice:
        'This product is currently not offered for sale. Existing product specifications are shown for reference only.',
    };
  }

  // Case 4: ACTIVE (Normal public storefront product)
  const isRobotsIndexable =
    product.robotsIndex !== false && (product as any).seoRobotsIndex !== false;
  const isStockAvailable = product.stockStatus !== 'out_of_stock';

  return {
    status: 'ACTIVE',
    isUrlAccessible: true,
    httpStatus: 200,
    isCatalogVisible: true,
    isSearchVisible: true,
    isRelatedProductsVisible: true,
    isFeaturedEligible: Boolean(product.isFeatured),
    isPurchasable: isStockAvailable,
    isIndexable: isRobotsIndexable,
    robotsIndex: isRobotsIndexable ? 'index' : 'noindex',
    robotsFollow: product.robotsFollow !== false ? 'follow' : 'nofollow',
    isSitemapEligible: isRobotsIndexable,
    isMerchantFeedEligible: isRobotsIndexable,
  };
}

/**
 * Fast helper predicates for convenience across modules.
 */
export function isProductPubliclyVisible(product: Partial<Product> | null | undefined): boolean {
  return resolveProductLifecycle(product).isCatalogVisible;
}

export function isProductUrlAccessible(product: Partial<Product> | null | undefined): boolean {
  return resolveProductLifecycle(product).isUrlAccessible;
}

export function isProductPurchasable(product: Partial<Product> | null | undefined): boolean {
  return resolveProductLifecycle(product).isPurchasable;
}

export function isProductSitemapEligible(product: Partial<Product> | null | undefined): boolean {
  return resolveProductLifecycle(product).isSitemapEligible;
}

export function isProductMerchantFeedEligible(product: Partial<Product> | null | undefined): boolean {
  return resolveProductLifecycle(product).isMerchantFeedEligible;
}
