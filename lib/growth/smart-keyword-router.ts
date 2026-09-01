import { Product, Category } from '@/lib/types';
import { normalizeKeywordTerm } from './product-keyword-engine';

export type SmartRouteType = 'PRODUCT' | 'CATEGORY' | 'SEARCH';
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SmartRouteResult {
  query: string;
  normalizedQuery: string;
  destinationUrl: string;
  routeType: SmartRouteType;
  confidence: MatchConfidence;
  confidenceScore: number;
  reason: string;
  matchedEntity?: {
    id: string;
    name: string;
    slug: string;
    type: 'product' | 'category';
  };
  alternativeSuggestions?: {
    label: string;
    url: string;
    type: 'product' | 'category' | 'search';
  }[];
}

const GENERIC_MODIFIERS = new Set([
  'pure',
  'organic',
  'natural',
  'ayurvedic',
  'original',
  'best',
  'sojat',
  'rajasthani',
  'special',
  '100',
  '100%',
  'essential',
  'premium',
]);

/**
 * Normalizes query string for router matching.
 */
function cleanTerm(text: string): string {
  return normalizeKeywordTerm(text || '').trim();
}

/**
 * Extracts core significant tokens by removing common marketing/purity modifiers.
 */
function getSignificantTokens(text: string): string[] {
  const clean = cleanTerm(text);
  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const sig = rawTokens.filter((t) => !GENERIC_MODIFIERS.has(t));
  return sig.length > 0 ? sig : rawTokens;
}

/**
 * Resolves a customer search query to the most relevant active product, category, or search page.
 * Follows strict priority:
 * 1. Exact active product name / slug / core name match (HIGH)
 * 2. Precision botanical & product-type match with specificity weighting (HIGH)
 * 3. High-confidence unique product discriminator match (HIGH)
 * 4. Exact category match / category synonym match (HIGH)
 * 5. Multi-token partial product match (MEDIUM)
 * 6. Broad / low confidence search fallback (LOW -> /products?search=...)
 */
export function resolveSmartKeywordRoute(params: {
  rawQuery: string;
  products: Product[];
  categories: Category[];
}): SmartRouteResult {
  const { rawQuery, products, categories } = params;
  const q = cleanTerm(rawQuery);

  // Default fallback if query is empty
  if (!q) {
    return {
      query: rawQuery,
      normalizedQuery: '',
      destinationUrl: '/products',
      routeType: 'SEARCH',
      confidence: 'LOW',
      confidenceScore: 0,
      reason: 'Empty query defaults to all products catalog',
    };
  }

  // Strictly filter only active products
  const activeProducts = (products || []).filter((p) => p && p.isActive !== false);
  const activeCategories = (categories || []).filter((c) => c && c.isActive !== false);

  const queryTokens = q.split(/\s+/).filter(Boolean);
  const querySigTokens = getSignificantTokens(q);
  const querySigStr = querySigTokens.join(' ');

  // -------------------------------------------------------------
  // 1. EXACT ACTIVE PRODUCT NAME / SLUG / CORE NAME MATCH (SCORE: 990 - 1000)
  // -------------------------------------------------------------
  for (const p of activeProducts) {
    const pName = cleanTerm(p.name);
    const pSlug = cleanTerm(p.slug.replace(/-/g, ' '));
    const pSigTokens = getSignificantTokens(p.name);
    const pSigStr = pSigTokens.join(' ');

    // 1A. Exact full title or slug match
    if (pName === q || pSlug === q) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${p.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 1000,
        reason: `Exact full match with product: "${p.name}"`,
        matchedEntity: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: 'product',
        },
      };
    }

    // 1B. Exact core name match (e.g. "amla powder" matching "Pure Organic Amla Powder")
    if (querySigStr === pSigStr && querySigTokens.length > 0) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${p.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 990,
        reason: `Exact core botanical match with product: "${p.name}"`,
        matchedEntity: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: 'product',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 2. EXACT CATEGORY / BROAD CATEGORY SYNONYM MATCH (SCORE: 950)
  // -------------------------------------------------------------
  for (const c of activeCategories) {
    const cName = cleanTerm(c.name);
    const cSlug = cleanTerm(c.slug.replace(/-/g, ' '));

    // Exact Category Match
    if (cName === q || cSlug === q) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/categories/${c.slug}`,
        routeType: 'CATEGORY',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `Exact match for category: "${c.name}"`,
        matchedEntity: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          type: 'category',
        },
      };
    }

    // Broad Category Synonym Matches via Unified Entity Taxonomy
    if (
      (cName.includes('henna') &&
        (q === 'mehndi' ||
          q === 'mehendi' ||
          q === 'mehandi' ||
          q === 'heena' ||
          q === 'henna powder' ||
          q === 'mehndi powder' ||
          q === 'mehendi powder' ||
          q === 'mehandi powder' ||
          q === 'sojat henna' ||
          q === 'sojat mehndi' ||
          q === 'natural henna' ||
          q === 'natural mehndi')) ||
      (cName.includes('hair') &&
        (q === 'hair care' || q === 'herbal hair care' || q === 'hair products')) ||
      (cName.includes('face') &&
        (q === 'face care' || q === 'skincare' || q === 'skin care' || q === 'facial care')) ||
      (cName.includes('herbal') &&
        (q === 'herbal products' || q === 'herbal' || q === 'ayurvedic products'))
    ) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/categories/${c.slug}`,
        routeType: 'CATEGORY',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `Strong synonym match for category: "${c.name}"`,
        matchedEntity: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          type: 'category',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 3. DYNAMIC SPECIFICITY & PRODUCT TYPE SCORING (SCORE: 880 - 945)
  // -------------------------------------------------------------
  let bestCandidate: Product | null = null;
  let highestCandidateScore = 0;
  let candidateReason = '';

  const isQueryOil = queryTokens.includes('oil') || queryTokens.includes('oils') || queryTokens.includes('tel');
  const isQueryPowder = queryTokens.includes('powder') || queryTokens.includes('powders') || queryTokens.includes('churna');
  const isQueryCone = queryTokens.includes('cone') || queryTokens.includes('cones') || queryTokens.includes('mehendi');
  const isQueryLeaves = queryTokens.includes('leaf') || queryTokens.includes('leaves') || queryTokens.includes('patte');

  for (const p of activeProducts) {
    const pName = cleanTerm(p.name);
    const pSlug = cleanTerm(p.slug.replace(/-/g, ' '));
    const pType = (p.productType || '').toUpperCase();
    const pSigTokens = getSignificantTokens(p.name);
    const pTokens = pName.split(/\s+/).filter(Boolean);

    // Check how many query significant tokens are present in product name/slug
    const matchedSigTokens = querySigTokens.filter(
      (qt) => pTokens.includes(qt) || pSlug.includes(qt)
    );

    if (matchedSigTokens.length === querySigTokens.length && querySigTokens.length > 0) {
      // Base score for all significant tokens present
      let score = 880;

      // Specificity Density: reward single-purpose products over broad multi-ingredient blends
      // e.g. "Amla Powder" (2 words) matching "Pure Organic Amla Powder" (2 sig words -> 100% density)
      // vs "Amla/Reetha/Shikakai/Hibiscus/Bhringraj Hair Pack" (7 sig words -> 28% density)
      const density = matchedSigTokens.length / Math.max(1, pSigTokens.length);
      score += Math.round(density * 50); // up to +50

      // Product Type Compatibility Adjustments
      if (isQueryOil) {
        if (pType === 'OIL' || pName.includes('oil')) {
          score += 40;
        } else if (pName.includes('cone') || pType === 'FINISHED') {
          score -= 300; // Do not send "oil" searches to cones
        }
      }

      if (isQueryCone) {
        if (pName.includes('cone') || pSlug.includes('cone')) {
          score += 40;
        }
      }

      if (isQueryPowder) {
        if (pType === 'POWDER' || pName.includes('powder')) {
          score += 20;
        }
      }

      if (isQueryLeaves) {
        if (pName.includes('leaf') || pName.includes('leaves') || pType === 'RAW') {
          score += 40;
        }
      }

      if (score > highestCandidateScore) {
        highestCandidateScore = score;
        bestCandidate = p;
        candidateReason = `Dynamic high-specificity match for: "${p.name}" (Score: ${score})`;
      }
    }
  }

  // If we found a high-confidence dynamic match (Score >= 910), prioritize it immediately
  if (bestCandidate && highestCandidateScore >= 910) {
    return {
      query: rawQuery,
      normalizedQuery: q,
      destinationUrl: `/products/${bestCandidate.slug}`,
      routeType: 'PRODUCT',
      confidence: 'HIGH',
      confidenceScore: highestCandidateScore,
      reason: candidateReason,
      matchedEntity: {
        id: bestCandidate.id,
        name: bestCandidate.name,
        slug: bestCandidate.slug,
        type: 'product',
      },
    };
  }

  // -------------------------------------------------------------
  // 4. HIGH-CONFIDENCE UNIQUE PRODUCT DISCRIMINATOR MATCH
  // -------------------------------------------------------------
  // A. BAQ Henna Powder ("baq", "baq henna", "pure baq henna", "body art quality henna")
  if (
    q.includes('baq') ||
    q.includes('body art quality') ||
    (queryTokens.includes('baq') && queryTokens.includes('henna'))
  ) {
    const baqProduct = activeProducts.find(
      (p) => p.slug.includes('baq') || cleanTerm(p.name).includes('baq')
    );
    if (baqProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${baqProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `Strong botanical intent match for BAQ Henna: "${baqProduct.name}"`,
        matchedEntity: {
          id: baqProduct.id,
          name: baqProduct.name,
          slug: baqProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // B. Bridal Mehendi Cones ("mehndi cone", "bridal mehndi", "bridal mehendi", "mehendi cones", "henna cone")
  // ONLY if not explicitly searching for oil
  if (
    !isQueryOil &&
    (q.includes('cone') ||
      q.includes('cones') ||
      q.includes('bridal mehndi') ||
      q.includes('bridal mehendi') ||
      q.includes('bridal cone') ||
      (q.includes('bridal') && (q.includes('henna') || q.includes('mehndi') || q.includes('mehendi'))))
  ) {
    const coneProduct = activeProducts.find(
      (p) =>
        p.slug.includes('cone') ||
        cleanTerm(p.name).includes('cone') ||
        cleanTerm(p.name).includes('bridal')
    );
    if (coneProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${coneProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Bridal Mehendi Cones: "${coneProduct.name}"`,
        matchedEntity: {
          id: coneProduct.id,
          name: coneProduct.name,
          slug: coneProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // C. Indigo Powder ("indigo", "indigo powder", "neel powder", "dark hair indigo")
  if (
    q.includes('indigo') ||
    q.includes('neel') ||
    q.includes('indigofera') ||
    (q.includes('black') && q.includes('hair') && (q.includes('dye') || q.includes('henna')))
  ) {
    const indigoProduct = activeProducts.find(
      (p) => p.slug.includes('indigo') || cleanTerm(p.name).includes('indigo')
    );
    if (indigoProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${indigoProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Indigo Powder: "${indigoProduct.name}"`,
        matchedEntity: {
          id: indigoProduct.id,
          name: indigoProduct.name,
          slug: indigoProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // D. Damask Rose Water ("rose water", "rosewater", "gulab jal", "damask rose")
  if (
    q.includes('rose water') ||
    q.includes('rosewater') ||
    q.includes('gulab jal') ||
    q.includes('damask rose') ||
    q.includes('rose spray') ||
    q.includes('rose mist')
  ) {
    const roseProduct = activeProducts.find(
      (p) => p.slug.includes('rose') || cleanTerm(p.name).includes('rose')
    );
    if (roseProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${roseProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Rose Water: "${roseProduct.name}"`,
        matchedEntity: {
          id: roseProduct.id,
          name: roseProduct.name,
          slug: roseProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // E. Raw Whole Henna Leaves ("raw leaves", "henna leaves", "raw henna", "whole henna leaves", "mehndi leaves")
  if (
    (q.includes('leaf') || q.includes('leaves') || q.includes('patte')) &&
    (q.includes('henna') || q.includes('raw') || q.includes('mehndi') || q.includes('sojat'))
  ) {
    const rawLeavesProduct = activeProducts.find(
      (p) => p.slug.includes('raw') || cleanTerm(p.name).includes('leaves')
    );
    if (rawLeavesProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${rawLeavesProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Raw Henna Leaves: "${rawLeavesProduct.name}"`,
        matchedEntity: {
          id: rawLeavesProduct.id,
          name: rawLeavesProduct.name,
          slug: rawLeavesProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // F. Sojat Pure Ultra-Fine / Triple-Shifted Henna Powder
  if (
    q.includes('ultra-fine') ||
    q.includes('ultra fine') ||
    q.includes('triple shifted') ||
    q.includes('triple-shifted') ||
    q.includes('shifted henna') ||
    (q.includes('pure') && q.includes('sojat') && q.includes('henna') && !q.includes('baq'))
  ) {
    const tripleShiftedProduct = activeProducts.find(
      (p) =>
        p.slug.includes('triple') ||
        cleanTerm(p.name).includes('triple') ||
        cleanTerm(p.name).includes('ultra-fine')
    );
    if (tripleShiftedProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${tripleShiftedProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Ultra-Fine / Triple-Shifted Henna: "${tripleShiftedProduct.name}"`,
        matchedEntity: {
          id: tripleShiftedProduct.id,
          name: tripleShiftedProduct.name,
          slug: tripleShiftedProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 5. MULTI-TOKEN PARTIAL PRODUCT MATCHING (MEDIUM CONFIDENCE)
  // -------------------------------------------------------------
  let bestPartialProduct: Product | null = null;
  let highestPartialScore = 0;
  let partialMatchReason = '';

  for (const p of activeProducts) {
    const pName = cleanTerm(p.name);
    const pShortDesc = cleanTerm(p.shortDescription || '');
    const pIngredients = (
      Array.isArray(p.ingredients) ? p.ingredients : [String(p.ingredients || '')]
    )
      .map(cleanTerm)
      .join(' ');

    let score = 0;
    const matchedTokens = queryTokens.filter((t) => pName.includes(t));

    if (matchedTokens.length === queryTokens.length && queryTokens.length > 1) {
      score += 750;
    } else if (matchedTokens.length > 0) {
      score += (matchedTokens.length / queryTokens.length) * 500;
    }

    if (pShortDesc.includes(q)) score += 200;
    if (pIngredients.includes(q)) score += 250;

    if (score > highestPartialScore) {
      highestPartialScore = score;
      bestPartialProduct = p;
      partialMatchReason = `Multi-token metadata match (${matchedTokens.length}/${queryTokens.length} tokens)`;
    }
  }

  if (bestPartialProduct && highestPartialScore >= 700) {
    return {
      query: rawQuery,
      normalizedQuery: q,
      destinationUrl: `/products/${bestPartialProduct.slug}`,
      routeType: 'PRODUCT',
      confidence: 'MEDIUM',
      confidenceScore: highestPartialScore,
      reason: partialMatchReason,
      matchedEntity: {
        id: bestPartialProduct.id,
        name: bestPartialProduct.name,
        slug: bestPartialProduct.slug,
        type: 'product',
      },
    };
  }

  // -------------------------------------------------------------
  // 6. LOW CONFIDENCE FALLBACK (NEVER REDIRECT BLINDLY)
  // -------------------------------------------------------------
  return {
    query: rawQuery,
    normalizedQuery: q,
    destinationUrl: `/products?search=${encodeURIComponent(rawQuery.trim())}`,
    routeType: 'SEARCH',
    confidence: 'LOW',
    confidenceScore: Math.max(highestCandidateScore, highestPartialScore),
    reason: 'Multi-item query or broad search intent routes to search results page',
  };
}

