/**
 * Unified Search Engine for Musky Dose
 * Provides weighted relevance scoring, entity normalization, and synonym expansion
 * Shared across:
 * - SearchDrawer.tsx (Live interactive search)
 * - ProductsClientView.tsx (Catalog search filter)
 * - smart-keyword-router.ts (Search query routing)
 */

import { Product } from '@/lib/types';
import {
  BOTANICAL_SEARCH_ENTITIES,
  normalizeEntityString,
  resolveEntityFromQuery,
  detectProductEntity,
  SearchEntity,
} from '@/lib/growth/entities';

export interface ScoredProductResult {
  product: Product;
  score: number;
  matchedEntity?: SearchEntity | null;
  matchedFields: string[];
}

/**
 * Normalizes query string, removing extra punctuation and spacing.
 */
export function normalizeSearchQuery(rawQuery: string): string {
  return normalizeEntityString(rawQuery);
}

/**
 * Calculates a weighted relevance score for a product against a search query.
 */
export function scoreProductForQuery(
  product: Product,
  rawQuery: string
): ScoredProductResult {
  const query = normalizeSearchQuery(rawQuery);
  const matchedFields: string[] = [];

  if (!query || !product || product.isActive === false) {
    return { product, score: 0, matchedFields };
  }

  let score = 0;
  const queryTokens = query.split(/\s+/).filter(Boolean);
  const queryEntity = resolveEntityFromQuery(query);
  const productEntity = detectProductEntity(product);

  const nameLower = (product.name || '').toLowerCase();
  const slugLower = (product.slug || '').toLowerCase();
  const skuLower = (product.sku || '').toLowerCase();
  const catLower = (product.categoryName || '').toLowerCase();
  const shortDescLower = (product.shortDescription || '').toLowerCase();
  const fullDescLower = (product.fullDescription || '').toLowerCase();
  const keywordsLower = Array.isArray(product.seoKeywords)
    ? product.seoKeywords.map((k) => String(k).toLowerCase())
    : [];
  const ingredientsLower = Array.isArray(product.ingredients)
    ? product.ingredients.map((i) => String(i).toLowerCase())
    : [];

  // 1. Exact Name / Slug Match (Weight: 100)
  if (nameLower === query || slugLower === query) {
    score += 100;
    matchedFields.push('name_exact');
  } else if (nameLower.includes(query)) {
    score += 80;
    matchedFields.push('name_phrase');
  }

  // 2. Token Overlap in Product Name (Weight: 25 per token)
  let nameTokenMatches = 0;
  for (const token of queryTokens) {
    if (nameLower.includes(token)) {
      nameTokenMatches++;
    }
  }
  if (nameTokenMatches > 0) {
    score += nameTokenMatches * 25;
    matchedFields.push('name_tokens');
  }

  // 3. Unified Entity & Synonym Match (Weight: 85)
  // If query is "mehndi" or "mehendi" and product belongs to HENNA_MEHNDI entity
  if (queryEntity && productEntity && queryEntity.id === productEntity.id) {
    score += 85;
    matchedFields.push(`entity_${queryEntity.id}`);
  }

  // 4. SKU Match (Weight: 60)
  if (skuLower && (skuLower === query || skuLower.includes(query))) {
    score += 60;
    matchedFields.push('sku');
  }

  // 5. Category Match (Weight: 45)
  if (catLower && (catLower === query || catLower.includes(query))) {
    score += 45;
    matchedFields.push('category');
  } else if (queryEntity && catLower.includes(queryEntity.categorySlug)) {
    score += 40;
    matchedFields.push('category_entity');
  }

  // 6. Primary / Secondary SEO Keywords Match (Weight: 40)
  const keywordMatch = keywordsLower.some((k) => k === query || k.includes(query));
  if (keywordMatch) {
    score += 40;
    matchedFields.push('keywords');
  }

  // 7. Short Description Match (Weight: 20)
  if (shortDescLower.includes(query)) {
    score += 20;
    matchedFields.push('short_description');
  }

  // 8. Full Description / Ingredients Match (Weight: 10)
  if (
    fullDescLower.includes(query) ||
    ingredientsLower.some((ing) => ing.includes(query))
  ) {
    score += 10;
    matchedFields.push('description_or_ingredients');
  }

  // 9. Scope Isolation: Down-weight unrelated botanicals if searching a specific single botanical
  // e.g. If searching "rose", pure henna product should not get bonus
  if (queryEntity && productEntity && queryEntity.id !== productEntity.id) {
    // If the query was purely the other entity's name (e.g. "rose"), prevent entity leakage
    if (queryEntity.aliases.includes(query)) {
      score = Math.max(0, score - 50);
    }
  }

  return {
    product,
    score,
    matchedEntity: productEntity,
    matchedFields,
  };
}

/**
 * Searches and ranks products using the unified search algorithm.
 * Filters out items below the relevance threshold and sorts descending by score.
 */
export function unifiedSearchProducts(
  products: Product[],
  rawQuery: string,
  minThreshold = 20
): Product[] {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return products.filter((p) => p && p.isActive !== false);

  const scored = products
    .filter((p) => p && p.isActive !== false)
    .map((p) => scoreProductForQuery(p, query))
    .filter((res) => res.score >= minThreshold);

  scored.sort((a, b) => b.score - a.score);

  return scored.map((res) => res.product);
}

export interface ScoredGuideResult {
  guide: any;
  score: number;
  matchedFields: string[];
}

/**
 * Calculates a relevance score for a ProductGuide against a search query.
 */
export function scoreGuideForQuery(guide: any, rawQuery: string): ScoredGuideResult {
  const query = normalizeSearchQuery(rawQuery);
  const matchedFields: string[] = [];

  if (!query || !guide || guide.published === false || guide.isPublished === false) {
    return { guide, score: 0, matchedFields };
  }

  let score = 0;
  const titleLower = (guide.title || '').toLowerCase();
  const slugLower = (guide.slug || '').toLowerCase();
  const introLower = (guide.shortIntro || '').toLowerCase();
  const catLower = (guide.category || '').toLowerCase();
  const keywordsLower = (guide.seoKeywords || '').toLowerCase();

  const queryEntity = resolveEntityFromQuery(query);

  if (titleLower === query || slugLower === query) {
    score += 100;
    matchedFields.push('title_exact');
  } else if (titleLower.includes(query)) {
    score += 75;
    matchedFields.push('title_phrase');
  }

  if (queryEntity) {
    const isHennaGuide =
      titleLower.includes('henna') ||
      titleLower.includes('mehndi') ||
      titleLower.includes('mehendi') ||
      titleLower.includes('mehandi') ||
      catLower.includes('henna') ||
      introLower.includes('henna') ||
      introLower.includes('mehndi');

    if (queryEntity.id === 'HENNA_MEHNDI' && isHennaGuide) {
      score += 80;
      matchedFields.push('entity_HENNA_MEHNDI');
    } else if (titleLower.includes(queryEntity.canonicalName.toLowerCase())) {
      score += 70;
      matchedFields.push(`entity_${queryEntity.id}`);
    }
  }

  if (keywordsLower.includes(query)) {
    score += 40;
    matchedFields.push('keywords');
  }

  if (introLower.includes(query)) {
    score += 25;
    matchedFields.push('intro');
  }

  return { guide, score, matchedFields };
}

export function unifiedSearchGuides(guides: any[], rawQuery: string, minThreshold = 20): any[] {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return guides.filter((g) => g && g.published !== false && g.isPublished !== false);

  const scored = guides
    .filter((g) => g && g.published !== false && g.isPublished !== false)
    .map((g) => scoreGuideForQuery(g, query))
    .filter((res) => res.score >= minThreshold);

  scored.sort((a, b) => b.score - a.score);

  return scored.map((res) => res.guide);
}

