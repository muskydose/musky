/**
 * MUSKY DOSE — SEARCH INTENT ROUTER & ORGANIC SEARCH CAPTURE ENGINE (PHASE 6)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Core Mandates:
 * 1. DETERMINISTIC INTENT CLASSIFICATION: Classifies user search queries into 10 explicit intent archetypes.
 * 2. SINGLE BEST DESTINATION: Resolves every query to the single strongest destination across Products,
 *    Categories, Guides, Knowledge Entities, Sojat Hub, and Wholesale.
 * 3. HENNA_MEHNDI UNIFICATION: All spelling variants (henna, mehndi, mehendi, heena, etc.) converge strictly.
 * 4. SEARCH CANNIBALIZATION DETECTION: Detects duplicate target intents competing across multiple URLs.
 * 5. MERCHANT CENTER FEED READINESS: Validates product catalog fields for future Google Merchant Center feed.
 * 6. ZERO INVENTED CLAIMS: Zero fake rankings, fake ratings, or fabricated search metrics.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
  resolveCanonicalEntity,
  normalizeEntityTerm,
  CanonicalEntityRecord,
} from './entity-registry';
import { ProductScope } from './universal-product-contract';

export type SearchIntentType =
  | 'INFORMATIONAL'
  | 'PRODUCT_DISCOVERY'
  | 'PRODUCT_SPECIFIC'
  | 'CATEGORY'
  | 'USE_CASE'
  | 'LOCAL'
  | 'WHOLESALE'
  | 'COMPARISON'
  | 'KNOWLEDGE'
  | 'NAVIGATIONAL';

export interface OrganicDestination {
  query: string;
  normalizedQuery: string;
  intent: SearchIntentType;
  primaryUrl: string;
  canonicalUrl: string;
  pageType: 'PRODUCT' | 'CATEGORY' | 'GUIDE' | 'KNOWLEDGE' | 'LOCAL_HUB' | 'WHOLESALE';
  entityKey?: string;
  effectiveScopes: ProductScope[];
  confidenceScore: number; // 0 - 1000
  reason: string;
  alternativeUrls?: { url: string; label: string; pageType: string }[];
}

export interface CannibalizationCollision {
  intent: SearchIntentType;
  entityKey?: string;
  competingUrls: string[];
  primaryUrl: string;
  actionRequired: 'PRESERVE_PRIMARY_AND_LINK_WEAKER' | 'CANONICALIZE' | 'REVIEW_CONTENT';
  warningMessage: string;
}

export interface GscQueryEvidence {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  destinationUrl: string;
  detectedEntity?: string;
  detectedIntent?: SearchIntentType;
  opportunityType: 'UNDERPERFORMING_RANK' | 'LOW_CTR' | 'HIGH_OPPORTUNITY' | 'WELL_OPTIMIZED';
}

export interface MerchantCenterProductPayload {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  price: string;
  brand: string;
  condition: 'new';
  sku: string;
  product_type?: string;
  google_product_category?: string;
  shipping_weight?: string;
}

// ----------------------------------------------------------------------------
// 1. CANONICAL ENTITY TO SLUG MAPPINGS
// ----------------------------------------------------------------------------
export const ENTITY_KEY_TO_SLUG: Record<string, string> = {
  HENNA_MEHNDI: 'henna-mehndi',
  INDIGO: 'indigo',
  AMLA: 'amla',
  SHIKAKAI: 'shikakai',
  REETHA: 'reetha',
  HIBISCUS: 'hibiscus',
  BHRINGRAJ: 'bhringraj',
  BRAHMI: 'brahmi',
  NEEM: 'neem',
  MORINGA: 'moringa',
  ROSE: 'rose',
  BEETROOT: 'beetroot',
  FENUGREEK: 'fenugreek',
  MULTANI_MITTI: 'multani-mitti',
  HERBAL_BLEND: 'herbal-blend',
  ESSENTIAL_OIL_SINGLE: 'essential-oil',
  CARRIER_OIL: 'carrier-oil',
};

export const SLUG_TO_ENTITY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITY_KEY_TO_SLUG).map(([k, v]) => [v, k])
);

// Alias Slugs that redirect to canonical HENNA_MEHNDI page
export const HENNA_ALIAS_SLUGS = new Set([
  'henna',
  'mehndi',
  'mehendi',
  'mehandi',
  'heena',
  'hina',
  'lawsonia-inermis',
  'madayantika',
]);

/**
 * Returns the canonical public knowledge URL for an entity key.
 */
export function getCanonicalKnowledgeUrl(entityKey: string): string | null {
  const slug = ENTITY_KEY_TO_SLUG[entityKey];
  if (!slug) return null;
  return `https://muskydose.in/knowledge/${slug}`;
}

// ----------------------------------------------------------------------------
// 2. DETERMINISTIC SEARCH INTENT CLASSIFIER
// ----------------------------------------------------------------------------
const WHOLESALE_INTENT_TERMS = [
  'wholesale',
  'bulk',
  'supplier',
  'suppliers',
  'manufacturer',
  'manufacturers',
  'b2b',
  'distributor',
  'distributors',
  'trader',
  'traders',
  'salon bulk',
  'artist supply',
  'rate card',
  'kg price',
];

const LOCAL_SOJAT_TERMS = [
  'sojat',
  'sojat henna',
  'sojat mehndi',
  'rajasthan henna',
  'sojat city',
  'origin',
  'gi tag',
  'pali',
];

const KNOWLEDGE_QUERY_PATTERNS = [
  'what is',
  'scientific name',
  'botanical name',
  'history of',
  'botanical family',
  'origin of',
  'definition of',
  'facts about',
];

const USE_CASE_PATTERNS = [
  'for hair',
  'hair dye',
  'hair color',
  'hair pack',
  'grey hair',
  'gray hair',
  'dandruff',
  'hair growth',
  'bridal',
  'for hands',
  'body art',
  'cones',
  'face pack',
  'skincare',
  'face glow',
  'how to use',
  'how to mix',
  'how to apply',
  'preparation guide',
  'aftercare',
];

const COMPARISON_PATTERNS = [
  'vs',
  'versus',
  'difference between',
  'or',
  'compared to',
];

/**
 * Classifies the search intent of a user query.
 */
export function classifySearchIntent(
  rawQuery: string,
  context?: { hasExactProductMatch?: boolean; isBrandQuery?: boolean }
): SearchIntentType {
  const q = normalizeEntityTerm(rawQuery);
  if (!q) return 'PRODUCT_DISCOVERY';

  // 1. Exact Product specific match flag
  if (context?.hasExactProductMatch) {
    return 'PRODUCT_SPECIFIC';
  }

  // 2. Wholesale / B2B query
  if (WHOLESALE_INTENT_TERMS.some((term) => q.includes(term))) {
    return 'WHOLESALE';
  }

  // 3. Local / Sojat origin query
  if (LOCAL_SOJAT_TERMS.some((term) => q.includes(term)) && !q.includes('powder') && !q.includes('buy')) {
    return 'LOCAL';
  }

  // 4. Knowledge / Botanical definition query / Pure Entity lookup
  if (
    KNOWLEDGE_QUERY_PATTERNS.some((pattern) => q.startsWith(pattern) || q.includes(pattern)) ||
    q.includes('lawsonia inermis') ||
    q.includes('indigofera tinctoria') ||
    q.includes('phyllanthus emblica') ||
    HENNA_ALIAS_SLUGS.has(q.replace(/\s+/g, '-')) ||
    q === 'henna' ||
    q === 'mehndi' ||
    q === 'mehendi' ||
    q === 'mehandi' ||
    q === 'heena' ||
    q === 'hina' ||
    q === 'indigo' ||
    q === 'amla' ||
    q === 'shikakai' ||
    q === 'reetha' ||
    q === 'hibiscus' ||
    q === 'bhringraj' ||
    q === 'brahmi' ||
    q === 'neem' ||
    q === 'moringa' ||
    q === 'rose' ||
    q === 'beetroot' ||
    q === 'fenugreek' ||
    q === 'multani mitti'
  ) {
    return 'KNOWLEDGE';
  }

  // 5. Comparison query
  if (COMPARISON_PATTERNS.some((pattern) => new RegExp(`\\b${pattern}\\b`, 'i').test(q))) {
    return 'COMPARISON';
  }

  // 6. Use case / application guide query
  if (USE_CASE_PATTERNS.some((pattern) => q.includes(pattern))) {
    return 'USE_CASE';
  }

  // 7. Navigational brand query
  if (q === 'musky dose' || q === 'muskydose' || q === 'muskydose.in' || q === 'musky dose store') {
    return 'NAVIGATIONAL';
  }

  // 8. Informational "how to" / "benefits"
  if (q.startsWith('how') || q.includes('benefits') || q.includes('storage') || q.includes('recipe')) {
    return 'INFORMATIONAL';
  }

  // 9. Category level commercial queries
  if (
    q === 'henna powder' ||
    q === 'mehndi powder' ||
    q === 'natural henna' ||
    q === 'hair care' ||
    q === 'herbal powders' ||
    q === 'face care' ||
    q === 'essential oils'
  ) {
    return 'CATEGORY';
  }

  // 10. Default commercial discovery
  return 'PRODUCT_DISCOVERY';
}

// ----------------------------------------------------------------------------
// 3. DETERMINISTIC ORGANIC DESTINATION RESOLVER
// ----------------------------------------------------------------------------
export function resolveOrganicDestination(params: {
  rawQuery: string;
  products?: Product[];
  categories?: Category[];
  guides?: ProductGuide[];
}): OrganicDestination {
  const { rawQuery, products = [], categories = [], guides = [] } = params;
  const q = normalizeEntityTerm(rawQuery);
  const activeProducts = products.filter((p) => p && p.isActive !== false);

  // 1. Resolve Canonical Entity via Phase 5 Central Registry
  const entityRes = resolveCanonicalEntity(rawQuery);
  const entityKey = entityRes.entityKey !== 'UNKNOWN' ? entityRes.entityKey : undefined;
  const effectiveScopes = entityRes.effectiveScopes;

  // 2. Check exact active product name or slug match
  const exactProduct = activeProducts.find((p) => {
    const pNameNorm = normalizeEntityTerm(p.name);
    const pSlugNorm = normalizeEntityTerm(p.slug.replace(/-/g, ' '));
    return pNameNorm === q || pSlugNorm === q || (q.includes('musky') && pNameNorm.includes(q.replace('musky dose', '').trim()));
  });

  if (exactProduct) {
    return {
      query: rawQuery,
      normalizedQuery: q,
      intent: 'PRODUCT_SPECIFIC',
      primaryUrl: `/products/${exactProduct.slug}`,
      canonicalUrl: `https://muskydose.in/products/${exactProduct.slug}`,
      pageType: 'PRODUCT',
      entityKey,
      effectiveScopes,
      confidenceScore: 1000,
      reason: `Exact match for product: "${exactProduct.name}"`,
    };
  }

  // 3. Classify Search Intent
  const intent = classifySearchIntent(rawQuery);

  // 4. Route by Intent Archetype
  // A. WHOLESALE INTENT
  if (intent === 'WHOLESALE') {
    return {
      query: rawQuery,
      normalizedQuery: q,
      intent: 'WHOLESALE',
      primaryUrl: '/wholesale',
      canonicalUrl: 'https://muskydose.in/wholesale',
      pageType: 'WHOLESALE',
      entityKey,
      effectiveScopes,
      confidenceScore: 980,
      reason: `Direct B2B wholesale enquiry intent detected ("${rawQuery}").`,
      alternativeUrls: [
        { url: '/contact', label: 'Contact Factory Direct', pageType: 'CONTACT' },
      ],
    };
  }

  // B. LOCAL / SOJAT INTENT
  if (intent === 'LOCAL') {
    return {
      query: rawQuery,
      normalizedQuery: q,
      intent: 'LOCAL',
      primaryUrl: '/sojat-henna',
      canonicalUrl: 'https://muskydose.in/sojat-henna',
      pageType: 'LOCAL_HUB',
      entityKey: 'HENNA_MEHNDI',
      effectiveScopes: ['HAIR', 'BODY_ART'],
      confidenceScore: 970,
      reason: `Sojat Henna geographical origin and authority hub intent.`,
    };
  }

  // C. KNOWLEDGE / BOTANICAL DEFINITION INTENT
  if (intent === 'KNOWLEDGE') {
    if (entityKey && entityKey !== 'UNKNOWN') {
      const slug = ENTITY_KEY_TO_SLUG[entityKey];
      if (slug) {
        return {
          query: rawQuery,
          normalizedQuery: q,
          intent: 'KNOWLEDGE',
          primaryUrl: `/knowledge/${slug}`,
          canonicalUrl: `https://muskydose.in/knowledge/${slug}`,
          pageType: 'KNOWLEDGE',
          entityKey,
          effectiveScopes,
          confidenceScore: 960,
          reason: `Resolved to authoritative canonical knowledge page for entity: ${entityKey}.`,
        };
      }
    }
  }

  // D. USE CASE / APPLICATION GUIDE INTENT
  if (intent === 'USE_CASE' || intent === 'INFORMATIONAL' || intent === 'COMPARISON') {
    // Check if matching published guide exists
    const matchingGuide = guides.find((g) => {
      const gTitleNorm = normalizeEntityTerm(g.title);
      const gSlugNorm = normalizeEntityTerm(g.slug.replace(/-/g, ' '));
      return gTitleNorm.includes(q) || gSlugNorm.includes(q);
    });

    if (matchingGuide) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        intent,
        primaryUrl: `/guides/${matchingGuide.slug}`,
        canonicalUrl: `https://muskydose.in/guides/${matchingGuide.slug}`,
        pageType: 'GUIDE',
        entityKey,
        effectiveScopes,
        confidenceScore: 940,
        reason: `Matched specialized guide: "${matchingGuide.title}"`,
      };
    }

    // If General / How to Use / Hair use case for Henna
    if (
      entityKey === 'HENNA_MEHNDI' &&
      (q.includes('hair') ||
        q.includes('dye') ||
        q.includes('color') ||
        q.includes('use') ||
        q.includes('mix') ||
        q.includes('apply') ||
        q.includes('how'))
    ) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        intent: intent === 'INFORMATIONAL' ? 'INFORMATIONAL' : 'USE_CASE',
        primaryUrl: '/guides/sojat-pure-henna-powder-complete-guide',
        canonicalUrl: 'https://muskydose.in/guides/sojat-pure-henna-powder-complete-guide',
        pageType: 'GUIDE',
        entityKey: 'HENNA_MEHNDI',
        effectiveScopes: q.includes('hair') ? ['HAIR'] : ['HAIR', 'BODY_ART'],
        confidenceScore: 930,
        reason: `Application guide destination for henna usage, preparation, and coloring intent.`,
      };
    }

    // If Body Art / Mehndi use case
    if (entityKey === 'HENNA_MEHNDI' && (q.includes('bridal') || q.includes('cone') || q.includes('hand') || q.includes('art'))) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        intent: 'USE_CASE',
        primaryUrl: '/products?category=henna',
        canonicalUrl: 'https://muskydose.in/products?category=henna',
        pageType: 'CATEGORY',
        entityKey: 'HENNA_MEHNDI',
        effectiveScopes: ['BODY_ART'],
        confidenceScore: 920,
        reason: `Body-art scoped destination for bridal mehndi and cone paste intent.`,
      };
    }
  }

  // E. CATEGORY / PRODUCT DISCOVERY INTENT
  // 1. Match category directly (preferred for broad commercial hubs)
  const matchingCat = categories.find((c) => {
    const cName = normalizeEntityTerm(c.name);
    const cSlug = normalizeEntityTerm(c.slug.replace(/-/g, ' '));
    return (
      cName === q ||
      cSlug === q ||
      (cName.includes('henna') && (q.includes('henna') || q.includes('mehndi')))
    );
  });

  // 2. Verified attribute gating (e.g. BAQ henna)
  if (q.includes('baq') || q.includes('body art quality')) {
    const verifiedBaqProduct = activeProducts.find((p) => {
      const pIntel = p.intelligence;
      const isHenna = pIntel?.entityKey === 'HENNA_MEHNDI' || normalizeEntityTerm(p.name).includes('henna');
      const hasVerifiedBaq = pIntel?.verifiedAttributes?.some((a: any) => {
        const attrSlug = a.slug || a.attributeSlug;
        return attrSlug === 'baq' || attrSlug === 'body-art-quality';
      });
      return isHenna && hasVerifiedBaq;
    });

    if (verifiedBaqProduct) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        intent: 'PRODUCT_DISCOVERY',
        primaryUrl: `/products/${verifiedBaqProduct.slug}`,
        canonicalUrl: `https://muskydose.in/products/${verifiedBaqProduct.slug}`,
        pageType: 'PRODUCT',
        entityKey: 'HENNA_MEHNDI',
        effectiveScopes: ['BODY_ART'],
        confidenceScore: 950,
        reason: `Matched verified BAQ (Body Art Quality) certified product: "${verifiedBaqProduct.name}"`,
      };
    } else {
      // Rule 3: BAQ must NEVER be injected unless destination product has verified BAQ intelligence.
      if (matchingCat) {
        return {
          query: rawQuery,
          normalizedQuery: q,
          intent: 'CATEGORY',
          primaryUrl: `/categories/${matchingCat.slug}`,
          canonicalUrl: `https://muskydose.in/categories/${matchingCat.slug}`,
          pageType: 'CATEGORY',
          entityKey: 'HENNA_MEHNDI',
          effectiveScopes: ['BODY_ART'],
          confidenceScore: 850,
          reason: `No active product possesses verified BAQ intelligence; routed cleanly to category hub without unverified attribute injection.`,
        };
      }
    }
  }

  if (matchingCat) {
    return {
      query: rawQuery,
      normalizedQuery: q,
      intent: 'CATEGORY',
      primaryUrl: `/categories/${matchingCat.slug}`,
      canonicalUrl: `https://muskydose.in/categories/${matchingCat.slug}`,
      pageType: 'CATEGORY',
      entityKey,
      effectiveScopes,
      confidenceScore: 910,
      reason: `Direct category match: "${matchingCat.name}"`,
    };
  }

  // 3. Flagship product fallback for broad commercial discovery when no category hub exists
  if (entityKey === 'HENNA_MEHNDI' && (q.includes('powder') || q.includes('natural') || q.includes('buy'))) {
    const flagshipHenna = activeProducts.find((p) => {
      const res = resolveCanonicalEntity(p);
      return res.entityKey === 'HENNA_MEHNDI';
    });
    if (flagshipHenna) {
      return {
        query: rawQuery,
        normalizedQuery: q,
        intent: 'PRODUCT_DISCOVERY',
        primaryUrl: `/products/${flagshipHenna.slug}`,
        canonicalUrl: `https://muskydose.in/products/${flagshipHenna.slug}`,
        pageType: 'PRODUCT',
        entityKey: 'HENNA_MEHNDI',
        effectiveScopes,
        confidenceScore: 900,
        reason: `Flagship product destination for broad commercial henna discovery in absence of category hub: "${flagshipHenna.name}"`,
      };
    }
  }

  // F. NAVIGATIONAL INTENT
  if (intent === 'NAVIGATIONAL') {
    return {
      query: rawQuery,
      normalizedQuery: q,
      intent: 'NAVIGATIONAL',
      primaryUrl: '/',
      canonicalUrl: 'https://muskydose.in',
      pageType: 'PRODUCT',
      confidenceScore: 1000,
      effectiveScopes: ['HERBAL'],
      reason: 'Direct brand navigational query.',
    };
  }

  // G. FALLBACK: Broad Search / Catalog
  return {
    query: rawQuery,
    normalizedQuery: q,
    intent: 'PRODUCT_DISCOVERY',
    primaryUrl: `/products?search=${encodeURIComponent(q)}`,
    canonicalUrl: `https://muskydose.in/products`,
    pageType: 'PRODUCT',
    entityKey,
    effectiveScopes,
    confidenceScore: 700,
    reason: `Multi-product catalog discovery search for "${rawQuery}".`,
  };
}

// ----------------------------------------------------------------------------
// 4. SEARCH CANNIBALIZATION DETECTION ENGINE
// ----------------------------------------------------------------------------
export function detectSearchCannibalization(
  routes: { query: string; destinationUrl: string; intent: SearchIntentType; entityKey?: string }[]
): CannibalizationCollision[] {
  const collisions: CannibalizationCollision[] = [];
  const intentEntityMap = new Map<string, Set<string>>();

  for (const r of routes) {
    const key = `${r.intent}:${r.entityKey || 'GLOBAL'}`;
    if (!intentEntityMap.has(key)) {
      intentEntityMap.set(key, new Set());
    }
    intentEntityMap.get(key)!.add(r.destinationUrl);
  }

  for (const [key, urlSet] of intentEntityMap.entries()) {
    if (urlSet.size > 1) {
      const [intentStr, entityKey] = key.split(':');
      const competingUrls = Array.from(urlSet);
      // Select primary URL deterministically (prefer Category over query-param, or Knowledge over thin search)
      const primaryUrl =
        competingUrls.find((u) => !u.includes('?search=') && (u.startsWith('/categories/') || u.startsWith('/knowledge/'))) ||
        competingUrls[0];

      collisions.push({
        intent: intentStr as SearchIntentType,
        entityKey: entityKey === 'GLOBAL' ? undefined : entityKey,
        competingUrls,
        primaryUrl,
        actionRequired: 'PRESERVE_PRIMARY_AND_LINK_WEAKER',
        warningMessage: `Multiple pages (${competingUrls.length}) are targeting the same ${intentStr} intent for ${entityKey}. Designated "${primaryUrl}" as canonical primary to prevent ranking cannibalization.`,
      });
    }
  }

  return collisions;
}

// ----------------------------------------------------------------------------
// 5. GOOGLE MERCHANT CENTER FEED READINESS HELPER
// ----------------------------------------------------------------------------
export function generateMerchantCenterProductPayload(
  product: Product
): MerchantCenterProductPayload | null {
  if (!product || product.isActive === false) return null;

  const baseUrl = 'https://muskydose.in';
  const priceFormatted = `${Number(product.price || 0).toFixed(2)} INR`;
  const availability: 'in_stock' | 'out_of_stock' =
    product.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'in_stock';

  return {
    id: String(product.id),
    title: product.name.trim(),
    description: (product.shortDescription || product.fullDescription || `${product.name} by Musky Dose`).slice(0, 5000),
    link: `${baseUrl}/products/${product.slug}`,
    image_link: product.images?.[0] || `${baseUrl}/images/placeholder.jpg`,
    availability,
    price: priceFormatted,
    brand: 'Musky Dose',
    condition: 'new',
    sku: product.sku || `MD-${product.slug.toUpperCase().slice(0, 12)}`,
    product_type: product.categoryName || 'Health & Beauty > Personal Care > Hair Care',
    google_product_category: 'Health & Beauty > Personal Care > Hair Care > Hair Coloring',
    shipping_weight: product.quantityOrWeight || '250 g',
  };
}
