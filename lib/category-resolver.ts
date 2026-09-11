/**
 * MUSKY DOSE — CANONICAL CATEGORY RESOLVER
 *
 * Mandate:
 * 1. categoryId is the canonical relationship.
 * 2. categories.name is the canonical category label.
 * 3. products.category_name must NEVER be treated as authoritative.
 * 4. Eliminates Category Name Drift without requiring product re-saves.
 */

import { Category, Product } from './types';

export interface CategoryReferenceEntity {
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}

/**
 * Authoritatively resolves the canonical category name for a product or category reference.
 * Priority:
 * 1. Matching category from authoritative categories array/map via categoryId
 * 2. Explicit runtime override name if provided
 * 3. Product's own stored categoryName (legacy fallback)
 * 4. Safe default ('Sojat Henna')
 */
export function resolveCanonicalCategoryName(
  product?: CategoryReferenceEntity | null,
  categories?: Category[] | null,
  overrideName?: string | null
): string {
  if (overrideName && overrideName.trim()) {
    return overrideName.trim();
  }

  if (product?.categoryId && Array.isArray(categories) && categories.length > 0) {
    const matched = categories.find((c) => c && c.id === product.categoryId);
    if (matched?.name && matched.name.trim()) {
      return matched.name.trim();
    }
  }

  if (product?.categoryName && product.categoryName.trim()) {
    return product.categoryName.trim();
  }

  return '';
}

/**
 * Authoritatively resolves the canonical category slug for a product or category reference.
 * Priority:
 * 1. Matching category from authoritative categories array/map via categoryId
 * 2. Explicit runtime override slug if provided
 * 3. Product's own stored categorySlug (if present)
 * 4. Empty string fallback
 */
export function resolveCanonicalCategorySlug(
  product?: CategoryReferenceEntity | null,
  categories?: Category[] | null,
  overrideSlug?: string | null
): string {
  if (overrideSlug && overrideSlug.trim()) {
    return overrideSlug.trim();
  }

  if (product?.categoryId && Array.isArray(categories) && categories.length > 0) {
    const matched = categories.find((c) => c && c.id === product.categoryId);
    if (matched?.slug && matched.slug.trim()) {
      return matched.slug.trim();
    }
    if (matched?.id && matched.id.trim()) {
      return matched.id.trim();
    }
  }

  if (product?.categorySlug && product.categorySlug.trim()) {
    return product.categorySlug.trim();
  }

  return '';
}

/**
 * Returns the canonical URL path for a product's category.
 * e.g. "/categories/herbal-hair-care" or fallback "/categories"
 */
export function resolveCanonicalCategoryUrl(
  product?: CategoryReferenceEntity | null,
  categories?: Category[] | null,
  overrideSlug?: string | null
): string {
  const slug = resolveCanonicalCategorySlug(product, categories, overrideSlug);
  return slug ? `/categories/${slug}` : '/categories';
}
