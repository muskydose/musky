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

/**
 * Normalizes query string for router matching.
 */
function cleanTerm(text: string): string {
  return normalizeKeywordTerm(text || '').trim();
}

/**
 * Resolves a customer search query to the most relevant product, category, or search page.
 * Follows strict priority:
 * 1. Exact product name / slug match (HIGH)
 * 2. High-confidence unique product discriminator match (HIGH)
 * 3. Exact category match / category synonym match (HIGH)
 * 4. Multi-token partial product match (MEDIUM)
 * 5. Broad / low confidence search fallback (LOW -> /products?search=...)
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

  const tokens = q.split(/\s+/).filter(Boolean);

  // -------------------------------------------------------------
  // 1. EXACT PRODUCT NAME / SLUG MATCH (HIGH CONFIDENCE)
  // -------------------------------------------------------------
  for (const p of products) {
    if (!p || p.isActive === false) continue;
    const pName = cleanTerm(p.name);
    const pSlug = cleanTerm(p.slug.replace(/-/g, ' '));

    if (pName === q || pSlug === q) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${p.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 1000,
        reason: `Exact match with product: "${p.name}"`,
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
  // 2. HIGH-CONFIDENCE UNIQUE PRODUCT DISCRIMINATOR MATCH
  // -------------------------------------------------------------
  // A. BAQ Henna Powder ("baq", "baq henna", "pure baq henna", "body art quality henna")
  if (
    q.includes('baq') ||
    q.includes('body art quality') ||
    (tokens.includes('baq') && tokens.includes('henna'))
  ) {
    const baqProduct = products.find(p => p.slug.includes('baq') || cleanTerm(p.name).includes('baq'));
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
  if (
    q.includes('cone') ||
    q.includes('cones') ||
    q.includes('bridal mehndi') ||
    q.includes('bridal mehendi') ||
    q.includes('bridal cone') ||
    (q.includes('bridal') && (q.includes('henna') || q.includes('mehndi') || q.includes('mehendi')))
  ) {
    const coneProduct = products.find(p => p.slug.includes('cone') || cleanTerm(p.name).includes('cone') || cleanTerm(p.name).includes('bridal'));
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
    const indigoProduct = products.find(p => p.slug.includes('indigo') || cleanTerm(p.name).includes('indigo'));
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

  // D. Amla Reetha Shikakai Hair Pack ("amla", "amla powder", "reetha", "shikakai", "amla hair pack", "hair pack")
  if (
    q.includes('amla') ||
    q.includes('reetha') ||
    q.includes('shikakai') ||
    q.includes('amalaki') ||
    (q.includes('hair') && q.includes('pack'))
  ) {
    const amlaProduct = products.find(p => p.slug.includes('amla') || cleanTerm(p.name).includes('amla') || cleanTerm(p.name).includes('shikakai'));
    if (amlaProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${amlaProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Herbal Hair Pack: "${amlaProduct.name}"`,
        matchedEntity: {
          id: amlaProduct.id,
          name: amlaProduct.name,
          slug: amlaProduct.slug,
          type: 'product',
        },
      };
    }
  }

  // E. Damask Rose Water ("rose water", "rosewater", "gulab jal", "damask rose")
  if (
    q.includes('rose water') ||
    q.includes('rosewater') ||
    q.includes('gulab jal') ||
    q.includes('damask rose') ||
    q.includes('rose spray') ||
    q.includes('rose mist')
  ) {
    const roseProduct = products.find(p => p.slug.includes('rose') || cleanTerm(p.name).includes('rose'));
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

  // F. Raw Whole Henna Leaves ("raw leaves", "henna leaves", "raw henna", "whole henna leaves", "mehndi leaves")
  if (
    (q.includes('leaf') || q.includes('leaves') || q.includes('patte')) &&
    (q.includes('henna') || q.includes('raw') || q.includes('mehndi') || q.includes('sojat'))
  ) {
    const rawLeavesProduct = products.find(p => p.slug.includes('raw') || cleanTerm(p.name).includes('leaves'));
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

  // G. Sojat Pure Triple-Shifted Henna Powder ("triple shifted", "triple-shifted", "sojat pure henna", "shifted henna")
  if (
    q.includes('triple shifted') ||
    q.includes('triple-shifted') ||
    q.includes('shifted henna') ||
    (q.includes('pure') && q.includes('sojat') && q.includes('henna') && !q.includes('baq'))
  ) {
    const tripleShiftedProduct = products.find(p => p.slug.includes('triple') || cleanTerm(p.name).includes('triple'));
    if (tripleShiftedProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/products/${tripleShiftedProduct.slug}`,
        routeType: 'PRODUCT',
        confidence: 'HIGH',
        confidenceScore: 950,
        reason: `High confidence match for Triple-Shifted Henna: "${tripleShiftedProduct.name}"`,
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
  // 3. EXACT CATEGORY / CATEGORY SYNONYM MATCH (HIGH CONFIDENCE)
  // -------------------------------------------------------------
  for (const c of categories) {
    if (!c || c.isActive === false) continue;
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
        confidenceScore: 900,
        reason: `Exact match for category: "${c.name}"`,
        matchedEntity: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          type: 'category',
        },
      };
    }

    // Category Synonym Matches
    if (
      (cName.includes('henna') && (q === 'mehndi' || q === 'mehendi' || q === 'henna powder' || q === 'sojat henna' || q === 'natural henna')) ||
      (cName.includes('hair') && (q === 'hair care' || q === 'herbal hair care' || q === 'hair products')) ||
      (cName.includes('face') && (q === 'face care' || q === 'skincare' || q === 'skin care' || q === 'facial care')) ||
      (cName.includes('herbal') && (q === 'herbal products' || q === 'herbal' || q === 'ayurvedic products'))
    ) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        destinationUrl: `/categories/${c.slug}`,
        routeType: 'CATEGORY',
        confidence: 'HIGH',
        confidenceScore: 900,
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
  // 4. MULTI-TOKEN PRODUCT MATCHING (MEDIUM CONFIDENCE)
  // -------------------------------------------------------------
  let bestProduct: Product | null = null;
  let highestScore = 0;
  let matchReason = '';

  for (const p of products) {
    if (!p || p.isActive === false) continue;
    const pName = cleanTerm(p.name);
    const pShortDesc = cleanTerm(p.shortDescription || '');
    const pIngredients = (Array.isArray(p.ingredients) ? p.ingredients : [String(p.ingredients || '')]).map(cleanTerm).join(' ');

    let score = 0;
    const matchedTokens = tokens.filter(t => pName.includes(t));

    if (matchedTokens.length === tokens.length && tokens.length > 1) {
      score += 750;
    } else if (matchedTokens.length > 0) {
      score += (matchedTokens.length / tokens.length) * 500;
    }

    if (pShortDesc.includes(q)) score += 200;
    if (pIngredients.includes(q)) score += 250;

    if (score > highestScore) {
      highestScore = score;
      bestProduct = p;
      matchReason = `Multi-token metadata match (${matchedTokens.length}/${tokens.length} tokens)`;
    }
  }

  if (bestProduct && highestScore >= 700) {
    return {
      query: rawQuery,
      normalizedQuery: q,
      destinationUrl: `/products/${bestProduct.slug}`,
      routeType: 'PRODUCT',
      confidence: 'MEDIUM',
      confidenceScore: highestScore,
      reason: matchReason,
      matchedEntity: {
        id: bestProduct.id,
        name: bestProduct.name,
        slug: bestProduct.slug,
        type: 'product',
      },
    };
  }

  // -------------------------------------------------------------
  // 5. LOW CONFIDENCE FALLBACK (NEVER REDIRECT BLINDLY)
  // -------------------------------------------------------------
  return {
    query: rawQuery,
    normalizedQuery: q,
    destinationUrl: `/products?search=${encodeURIComponent(rawQuery.trim())}`,
    routeType: 'SEARCH',
    confidence: 'LOW',
    confidenceScore: highestScore,
    reason: 'Multi-item query or broad search intent routes to search results page',
  };
}

