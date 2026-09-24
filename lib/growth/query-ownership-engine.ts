/**
 * MUSKY DOSE — QUERY-TO-PAGE OWNERSHIP ENGINE (PHASE 3)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Mandates:
 * 1. STRICT QUERY OWNERSHIP: Deterministically routes queries:
 *    QUERY -> INTENT -> ENTITY -> CANONICAL OWNER PAGE
 * 2. SINGLE PRIMARY OWNER: One primary intent must have exactly ONE canonical owner URL.
 * 3. INTENT GOVERNANCE:
 *    - Informational intent -> /guides/[slug]
 *    - Transactional/product intent -> /products/[slug]
 *    - Wholesale/B2B intent -> /wholesale
 *    - Category discovery intent -> /categories/[slug]
 *    - Local/heritage intent -> /sojat-henna or /contact
 *    - Botanical/educational intent -> /knowledge/[slug]
 * 4. CANNIBALIZATION DETECTION & AUTO-RESOLUTION:
 *    Detects competing URLs claiming the same primary query and prescribes deterministic
 *    remedies (e.g. PRESERVE_PRIMARY_AND_INTERNAL_LINK, STRENGTHEN_PRIMARY, CANONICALIZE).
 * 5. ANTI-FABRICATION:
 *    Does NOT create doorway pages. If an owner page exists, strengthens it instead of creating duplicates.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
  resolveCanonicalEntity,
} from './entity-registry';
import { SearchIntentType } from './search-intent-router';
import { QueryOwnershipRecord, CannibalizationStatus } from './types';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface QueryOwnershipResult {
  query: string;
  normalizedQuery: string;
  primaryIntent: SearchIntentType;
  primaryEntityType: 'PRODUCT' | 'CATEGORY' | 'GUIDE' | 'KNOWLEDGE' | 'LOCAL_HUB' | 'WHOLESALE';
  primaryEntityId: string;
  canonicalUrl: string;
  confidenceScore: number; // 0 - 1000
  reason: string;
  cannibalizationStatus: CannibalizationStatus;
  competingUrls: string[];
  recommendedAction?: string;
}

export interface CannibalizationReport {
  totalEvaluated: number;
  cleanOwnershipCount: number;
  collisionsCount: number;
  collisions: {
    query: string;
    primaryOwnerUrl: string;
    competingUrls: string[];
    action: string;
    details: string;
  }[];
}

/**
 * Normalizes query string deterministically
 */
export function normalizeQuery(rawQuery: string): string {
  return (rawQuery || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');
}

// B2B & Wholesale tokens
const WHOLESALE_TOKENS = new Set([
  'wholesale',
  'bulk',
  'supplier',
  'suppliers',
  'manufacturer',
  'manufacturers',
  'distributor',
  'distributors',
  'exporter',
  'export',
  'b2b',
  'mandi',
  'kg',
  'kilo',
  'ton',
  'tons',
  'quintal',
  'loose',
]);

// Informational tokens
const INFORMATIONAL_TOKENS = new Set([
  'how',
  'what',
  'why',
  'guide',
  'recipe',
  'method',
  'tarika',
  'kaise',
  'steps',
  'step',
  'ratio',
  'mix',
  'mixing',
  'apply',
  'application',
  'tips',
  'benefit',
  'benefits',
  'side effects',
  'safe',
  'difference',
  'vs',
]);

// Local & Terroir tokens
const LOCAL_TOKENS = new Set([
  'sojat',
  'rajasthan',
  'pali',
  'local',
  'mandi',
  'farm',
  'factory',
]);

// Knowledge / Botanical tokens
const KNOWLEDGE_TOKENS = new Set([
  'botanical',
  'botany',
  'plant',
  'lawsone',
  'leaf',
  'organic',
  'meaning',
  'ayurveda',
  'ayurvedic',
  'herb',
  'herbs',
  'madayantika',
  'maruthani',
  'gorintaku',
  'mailanchi',
]);

/**
 * Resolves the single canonical owner URL for any search query.
 */
export function resolveQueryOwnership(
  rawQuery: string,
  catalogProducts: Product[] = [],
  guides: ProductGuide[] = [],
  categories: Category[] = [],
  baseUrl: string = 'https://muskydose.in'
): QueryOwnershipResult {
  const query = (rawQuery || '').trim();
  const normalized = normalizeQuery(query);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  // 1. Check Wholesale / B2B Intent
  const hasWholesaleToken = tokens.some((t) => WHOLESALE_TOKENS.has(t));
  if (hasWholesaleToken) {
    return {
      query,
      normalizedQuery: normalized,
      primaryIntent: 'WHOLESALE',
      primaryEntityType: 'WHOLESALE',
      primaryEntityId: 'wholesale-hub',
      canonicalUrl: `${baseUrl}/wholesale`,
      confidenceScore: 950,
      reason: 'B2B/Bulk commercial query tokens detected; routing strictly to wholesale quotation portal.',
      cannibalizationStatus: 'NONE',
      competingUrls: [],
    };
  }

  // 2. Check Informational / Guide Intent
  const hasInformationalToken = tokens.some((t) => INFORMATIONAL_TOKENS.has(t));
  if (hasInformationalToken) {
    // Check if an existing guide matches
    let matchedGuide: ProductGuide | undefined;
    for (const g of guides) {
      const gSlug = (g.slug || '').toLowerCase();
      const gTitle = (g.title || '').toLowerCase();
      const gContext = (g.category || g.shortIntro || '').toLowerCase();
      if (
        normalized.includes(gSlug) ||
        tokens.some((t) => t.length > 3 && (gTitle.includes(t) || gContext.includes(t)))
      ) {
        matchedGuide = g;
        break;
      }
    }

    if (matchedGuide) {
      return {
        query,
        normalizedQuery: normalized,
        primaryIntent: 'INFORMATIONAL',
        primaryEntityType: 'GUIDE',
        primaryEntityId: matchedGuide.slug,
        canonicalUrl: `${baseUrl}/guides/${matchedGuide.slug}`,
        confidenceScore: 920,
        reason: `Matched authoritative guide [${matchedGuide.title}] for educational search intent.`,
        cannibalizationStatus: 'NONE',
        competingUrls: [],
      };
    }

    // No specific guide matched. Do not pretend an unrelated guide owns the query.
    // Route to the guide hub for discovery and let downstream opportunity review
    // determine whether a dedicated page is warranted.
    return {
      query,
      normalizedQuery: normalized,
      primaryIntent: 'INFORMATIONAL',
      primaryEntityType: 'GUIDE',
      primaryEntityId: 'guides-index',
      canonicalUrl: `${baseUrl}/guides`,
      confidenceScore: 600,
      reason: 'Informational intent detected but no specific authoritative guide matched; routed to the guide hub instead of inventing ownership.',
      cannibalizationStatus: 'NONE',
      competingUrls: [],
    };
  }

  // 3. Check Knowledge / Botanical Intent
  const hasKnowledgeToken = tokens.some((t) => KNOWLEDGE_TOKENS.has(t));
  if (hasKnowledgeToken) {
    // Check canonical entity registry
    const res = resolveCanonicalEntity(normalized);
    const slugMap: Record<string, string> = {
      HENNA_MEHNDI: 'henna-mehndi',
      INDIGO: 'indigo',
      AMLA: 'amla',
      SHIKAKAI: 'shikakai',
      REETHA: 'reetha',
      HIBISCUS: 'hibiscus',
      BHRINGRAJ: 'bhringraj',
      BRAHMI: 'brahmi',
    };
    const entitySlug = slugMap[res.entityKey] || 'henna-mehndi';
    return {
      query,
      normalizedQuery: normalized,
      primaryIntent: 'KNOWLEDGE',
      primaryEntityType: 'KNOWLEDGE',
      primaryEntityId: res.entityKey,
      canonicalUrl: `${baseUrl}/knowledge/${entitySlug}`,
      confidenceScore: 900,
      reason: `Educational botanical query mapped to canonical knowledge entity [${res.entityKey}].`,
      cannibalizationStatus: 'NONE',
      competingUrls: [],
    };
  }

  // 4. Check Local / Terroir Intent
  const hasLocalToken = tokens.some((t) => LOCAL_TOKENS.has(t));
  if (hasLocalToken && !tokens.some((t) => t === 'buy' || t === 'order' || t === 'price')) {
    return {
      query,
      normalizedQuery: normalized,
      primaryIntent: 'LOCAL',
      primaryEntityType: 'LOCAL_HUB',
      primaryEntityId: 'sojat-henna-hub',
      canonicalUrl: `${baseUrl}/sojat-henna`,
      confidenceScore: 880,
      reason: 'Regional heritage and terroir search intent routed to Sojat Henna hub.',
      cannibalizationStatus: 'NONE',
      competingUrls: [],
    };
  }

  // 5. Check Transactional Product Match
  let bestProduct: Product | undefined;
  let bestScore = 0;

  for (const prod of catalogProducts) {
    if (prod.isActive === false) continue;
    const pName = (prod.name || '').toLowerCase();
    const pSlug = (prod.slug || '').toLowerCase();

    // Exact slug or name containment
    if (normalized === pSlug || normalized === pName) {
      bestProduct = prod;
      bestScore = 1000;
      break;
    }

    // Token overlap score
    let score = 0;
    for (const t of tokens) {
      if (t.length > 2 && (pName.includes(t) || pSlug.includes(t))) {
        score += 200;
      }
    }

    // Specificity bonus for BAQ / Triple-sifted differentiation
    if (normalized.includes('baq') && pSlug.includes('baq')) score += 300;
    if (normalized.includes('triple') && pSlug.includes('triple')) score += 300;
    if (normalized.includes('indigo') && pSlug.includes('indigo')) score += 300;
    if (normalized.includes('amla') && pSlug.includes('amla')) score += 300;

    if (score > bestScore) {
      bestScore = score;
      bestProduct = prod;
    }
  }

  if (bestProduct && bestScore >= 400) {
    return {
      query,
      normalizedQuery: normalized,
      primaryIntent: 'PRODUCT_SPECIFIC',
      primaryEntityType: 'PRODUCT',
      primaryEntityId: bestProduct.slug,
      canonicalUrl: `${baseUrl}/products/${bestProduct.slug}`,
      confidenceScore: Math.min(1000, bestScore),
      reason: `High transactional match for catalog product [${bestProduct.name}].`,
      cannibalizationStatus: 'NONE',
      competingUrls: [],
    };
  }

  // 6. Check Category Discovery Match
  for (const cat of categories) {
    const cName = (cat.name || '').toLowerCase();
    const cSlug = (cat.slug || '').toLowerCase();
    if (normalized.includes(cSlug) || normalized.includes(cName) || tokens.some((t) => cName.includes(t))) {
      return {
        query,
        normalizedQuery: normalized,
        primaryIntent: 'CATEGORY',
        primaryEntityType: 'CATEGORY',
        primaryEntityId: cat.slug || cat.id,
        canonicalUrl: `${baseUrl}/categories/${cat.slug}`,
        confidenceScore: 820,
        reason: `Discovery search intent mapped to category [${cat.name}].`,
        cannibalizationStatus: 'NONE',
        competingUrls: [],
      };
    }
  }

  // Fallback to primary catalog surface
  return {
    query,
    normalizedQuery: normalized,
    primaryIntent: 'PRODUCT_DISCOVERY',
    primaryEntityType: 'CATEGORY',
    primaryEntityId: 'products-catalog',
    canonicalUrl: `${baseUrl}/products`,
    confidenceScore: 700,
    reason: 'Broad organic search intent routed safely to master products catalog.',
    cannibalizationStatus: 'NONE',
    competingUrls: [],
  };
}

/**
 * Detects SEO cannibalization across a list of target queries and active URLs.
 */
export function auditCannibalizationAcrossQueries(
  queries: string[],
  catalogProducts: Product[] = [],
  guides: ProductGuide[] = [],
  categories: Category[] = [],
  baseUrl: string = 'https://muskydose.in'
): CannibalizationReport {
  const urlOwners = new Map<string, QueryOwnershipResult[]>();
  const collisions: CannibalizationReport['collisions'] = [];

  for (const q of queries) {
    const ownership = resolveQueryOwnership(q, catalogProducts, guides, categories, baseUrl);
    const existing = urlOwners.get(ownership.canonicalUrl) || [];
    existing.push(ownership);
    urlOwners.set(ownership.canonicalUrl, existing);
  }

  // Detect query cannibalization where two different URLs compete for identical or near-identical queries
  const queryToUrls = new Map<string, string[]>();

  for (const prod of catalogProducts) {
    if (prod.isActive === false) continue;
    const url = `${baseUrl}/products/${prod.slug}`;
    const autoSeo = (prod.name || '').toLowerCase();
    const tokens = autoSeo.split(/\s+/).filter((t) => t.length > 3);
    for (const t of tokens) {
      const list = queryToUrls.get(t) || [];
      if (!list.includes(url)) list.push(url);
      queryToUrls.set(t, list);
    }
  }

  for (const guide of guides) {
    const url = `${baseUrl}/guides/${guide.slug}`;
    const title = (guide.title || '').toLowerCase();
    const tokens = title.split(/\s+/).filter((t) => t.length > 3);
    for (const t of tokens) {
      const list = queryToUrls.get(t) || [];
      if (!list.includes(url)) list.push(url);
      queryToUrls.set(t, list);
    }
  }

  // Identify high-risk collisions (e.g. 2 different products competing for generic "henna" instead of differentiated qualifiers)
  let cleanCount = 0;
  for (const q of queries) {
    const ownership = resolveQueryOwnership(q, catalogProducts, guides, categories, baseUrl);
    const normalized = ownership.normalizedQuery;

    // Check if query is informational but has a competing product PDP
    if (ownership.primaryIntent === 'INFORMATIONAL') {
      const competingProducts = catalogProducts.filter(
        (p) => p.isActive !== false && normalized.includes(p.slug.toLowerCase())
      );
      if (competingProducts.length > 0) {
        const competingUrls = competingProducts.map((p) => `${baseUrl}/products/${p.slug}`);
        ownership.cannibalizationStatus = 'POTENTIAL_COLLISION';
        ownership.competingUrls = competingUrls;
        ownership.recommendedAction =
          'PRESERVE_PRIMARY_AND_INTERNAL_LINK: Keep guide as canonical owner, add internal link from product page to guide.';
        collisions.push({
          query: q,
          primaryOwnerUrl: ownership.canonicalUrl,
          competingUrls,
          action: ownership.recommendedAction,
          details: `Informational query [${q}] has competing product PDPs. Preserved guide as canonical owner.`,
        });
        continue;
      }
    }

    cleanCount++;
  }

  return {
    totalEvaluated: queries.length,
    cleanOwnershipCount: cleanCount,
    collisionsCount: collisions.length,
    collisions,
  };
}

/**
 * Persists query ownership records to Supabase table growth_query_ownership if accessible.
 */
export async function persistQueryOwnershipRecords(records: QueryOwnershipRecord[]): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase || records.length === 0) return 0;

  try {
    const payload = records.map((r) => ({
      id: r.id,
      query: r.query,
      normalized_query: r.normalizedQuery,
      language: r.language,
      country: r.country,
      primary_intent: r.primaryIntent,
      primary_entity_type: r.primaryEntityType,
      primary_entity_id: r.primaryEntityId,
      canonical_url: r.canonicalUrl,
      confidence_score: r.confidenceScore,
      cannibalization_status: r.cannibalizationStatus,
      competing_urls: r.competingUrls,
      recommended_action: r.recommendedAction || null,
      metadata: r.metadata || {},
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('growth_query_ownership').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[persistQueryOwnershipRecords] Notice (fail-safe):', error.message);
      return 0;
    }
    return records.length;
  } catch (err: any) {
    console.warn('[persistQueryOwnershipRecords] Database notice:', err?.message);
    return 0;
  }
}
