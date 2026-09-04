/**
 * MUSKY DOSE — SEO ACQUISITION V2: DEMAND MINING & QUERY CLUSTER ENGINE
 * 
 * Safety & Governance:
 * 1. REAL GSC DATA: No fabricated search volumes, rankings, CTRs, or impressions.
 * 2. HENNA_MEHNDI UNIFIED ENTITY: Single canonical entity for all natural spelling variations.
 * 3. NO DOORWAY PAGES: Zero programmatic city or duplicate spelling URL generation.
 * 4. DETERMINISTIC INTENT: Strict separation between Retail, B2B Wholesale, Local Sojat, and Informational.
 * 5. OVERRIDE HIERARCHY: manual override > approved admin value > generated value.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import { SearchConsoleQuery, GrowthOpportunityPriority } from './types';
import { getSiteSettings, updateSiteSettings } from '@/lib/db/settings';

// ============================================================
// 1. INTENT & ENTITY TYPES
// ============================================================

export type QueryIntentFamily = 'RETAIL' | 'B2B' | 'LOCAL' | 'PROBLEM_USE_CASE' | 'INFORMATIONAL';
export type CommercialSignalLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type LocationSignal = 'SOJAT' | 'RAJASTHAN' | 'PAN_INDIA' | null;

export type BotanicalEntityKey =
  | 'HENNA_MEHNDI'
  | 'INDIGO'
  | 'AMLA'
  | 'HIBISCUS'
  | 'ROSE_WATER'
  | 'ESSENTIAL_OIL'
  | 'AYURVEDIC_HERB'
  | 'GENERAL_BOTANICAL';

export interface QueryCluster {
  query: string;
  canonicalQuery: string;
  normalizedQuery: string;
  intent: QueryIntentFamily;
  entity: BotanicalEntityKey;
  locationSignal: LocationSignal;
  commercialSignal: CommercialSignalLevel;
  recommendedDestination: string;
  destinationType: 'PRODUCT' | 'CATEGORY' | 'WHOLESALE' | 'SOJAT_HENNA' | 'GUIDE' | 'HOMEPAGE' | 'SEARCH';
  acquisitionPriority: 'P1_NOW' | 'P2_NEXT' | 'P3_BACKLOG';
  matchedEntityId?: string;
  matchedEntityName?: string;
}

export type SeoDemandOpportunityType =
  | 'HIGH_IMPRESSION_LOW_CTR'
  | 'STRIKING_DISTANCE'
  | 'HIGH_COMMERCIAL_INTENT'
  | 'DESTINATION_MISMATCH'
  | 'QUERY_DESTINATION_MISMATCH'
  | 'NO_STRONG_DESTINATION'
  | 'CONTENT_GAP'
  | 'CANNIBALIZATION'
  | 'CONVERSION_GAP';

export type RecommendationLifecycleStatus = 'NEW' | 'REVIEWED' | 'DISMISSED' | 'IMPLEMENTED';

export interface GscSearchRow {
  query: string;
  page: string;
  date?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  entityKey?: string;
  searchIntent?: string;
  destinationType?: string;
  opportunityType?: SeoDemandOpportunityType;
}

export interface GscOpportunityThresholds {
  minImpressionsLowCtr?: number;
  maxCtrLowCtr?: number;
  minStrikingPosition?: number;
  maxStrikingPosition?: number;
  minStrikingImpressions?: number;
  minContentGapImpressions?: number;
}

export const DEFAULT_GSC_THRESHOLDS: Required<GscOpportunityThresholds> = {
  minImpressionsLowCtr: 50,
  maxCtrLowCtr: 0.03,
  minStrikingPosition: 4.0,
  maxStrikingPosition: 20.0,
  minStrikingImpressions: 20,
  minContentGapImpressions: 15,
};

export type ProductQueryMatchType = 'EXACT_MATCH' | 'PARTIAL_MATCH' | 'VARIANT_MATCH' | 'UNRESOLVED';

export interface ProductQueryMatchResult {
  matchType: ProductQueryMatchType;
  product: Product | null;
  targetUrl: string;
  confidence: number;
  matchedField?: 'title' | 'slug' | 'alias' | 'brand_product';
}

export interface HennaSubCluster {
  subIntent: 'HAIR' | 'BRIDAL_BODY_ART' | 'SOJAT_ORIGIN' | 'WHOLESALE_BULK' | 'GENERAL_CATEGORY';
  label: string;
  recommendedDestination: string;
  queries: string[];
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averagePosition: number;
}

export interface HennaSearchCluster {
  canonicalEntityKey: 'HENNA_MEHNDI';
  canonicalName: 'Henna / Mehndi';
  totalQueries: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averagePosition: number;
  subClusters: HennaSubCluster[];
  dataStatus: 'DATA_AVAILABLE' | 'DATA_NOT_AVAILABLE';
}


export interface SeoAcquisitionRecommendation {
  query: string;
  intent: QueryIntentFamily;
  currentUrl?: string;
  recommendedAction:
    | 'OPTIMIZE_TITLE'
    | 'IMPROVE_META'
    | 'ADD_INTERNAL_LINK'
    | 'IMPROVE_CTA'
    | 'ROUTE_TO_WHOLESALE'
    | 'CREATE_APPROVED_CONTENT'
    | 'RESOLVE_CANNIBALIZATION';
  targetUrl: string;
  reason: string;
  expectedOutcome: string;
}

export interface SeoDemandOpportunity {
  id: string;
  type: SeoDemandOpportunityType;
  title: string;
  description: string;
  priority: GrowthOpportunityPriority;
  growthScore: number;
  scoreBreakdown: {
    demand: number;
    visibilityGap: number;
    conversionPotential: number;
    commercialValue: number;
    contentReadiness: number;
  };
  query: string;
  cluster: QueryCluster;
  gscMetrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    landingPage?: string;
  };
  recommendation: SeoAcquisitionRecommendation;
  status: 'NEW' | 'REVIEW' | 'APPROVED' | 'APPLIED' | 'VERIFIED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export interface SeoActionRecord {
  id: string;
  actionId: string;
  opportunityId: string;
  query: string;
  intent: QueryIntentFamily;
  targetUrl: string;
  mutationType: 'UPDATE_META_TITLE' | 'UPDATE_META_DESCRIPTION' | 'ADD_SEARCH_KEYWORD' | 'UPDATE_CANONICAL' | 'CREATE_INTERNAL_LINK';
  beforeSnapshot: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string[];
  };
  afterSnapshot: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string[];
  };
  status: 'NEW' | 'REVIEW' | 'APPROVED' | 'APPLIED' | 'VERIFIED' | 'DISMISSED';
  appliedAt?: string;
  appliedBy?: string;
  verifiedAt?: string;
  verificationResult?: 'PASS' | 'FAIL' | 'PENDING';
  idempotentKey: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 2. TOKEN & BOTANICAL DICTIONARIES
// ============================================================

export const HENNA_MEHNDI_ALIASES = new Set([
  'henna',
  'mehndi',
  'mehendi',
  'mehandi',
  'heena',
  'hina',
  'lawsonia inermis',
  'madayantika',
]);

const B2B_TOKENS = new Set([
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
  'mandi',
  'salon',
  'salons',
  'reseller',
  'resellers',
]);

const LOCAL_SOJAT_TOKENS = new Set([
  'sojat',
  'pali',
  'rajasthan',
  'rajasthani',
  'marwar',
]);

const RETAIL_PACK_REGEX = /\b(\d+\s*(g|gm|gms|gram|grams|kg|ml|ltr|litre|liter|piece|pieces|pack|cones?))\b/i;

const PROBLEM_USE_CASE_TOKENS = new Set([
  'grey hair',
  'gray hair',
  'white hair',
  'hair fall',
  'dandruff',
  'conditioning',
  'cooling',
  'scalp',
  'bridal',
  'wedding',
  'stain',
  'dark stain',
]);

const INFORMATIONAL_REGEX = /\b(how to|guide|tutorial|steps|recipe|benefits|uses|side effects|meaning|what is|difference between|vs)\b/i;

// ============================================================
// 3. INTENT CLASSIFICATION & ENTITY RESOLUTION
// ============================================================

export function normalizeQueryString(rawQuery: string): string {
  return (rawQuery || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveBotanicalEntity(normalizedQuery: string): BotanicalEntityKey {
  const q = normalizedQuery;

  // Strict Henna/Mehndi Entity Unification
  for (const alias of HENNA_MEHNDI_ALIASES) {
    if (q.includes(alias)) {
      return 'HENNA_MEHNDI';
    }
  }

  if (q.includes('indigo') || q.includes('neel') || q.includes('avuri')) {
    return 'INDIGO';
  }
  if (q.includes('amla') || q.includes('amalaki') || q.includes('gooseberry')) {
    return 'AMLA';
  }
  if (q.includes('hibiscus') || q.includes('gudhal') || q.includes('jaswand')) {
    return 'HIBISCUS';
  }
  if (q.includes('rose water') || q.includes('gulab jal') || q.includes('damask')) {
    return 'ROSE_WATER';
  }
  if (q.includes('essential oil') || q.includes('eucalyptus') || q.includes('tea tree') || q.includes('clove') || q.includes('lavender') || q.includes('rosemary') || q.includes('peppermint')) {
    return 'ESSENTIAL_OIL';
  }
  if (q.includes('reetha') || q.includes('shikakai') || q.includes('bhringraj') || q.includes('neem') || q.includes('moringa') || q.includes('brahmi')) {
    return 'AYURVEDIC_HERB';
  }

  return 'GENERAL_BOTANICAL';
}

export function classifyQueryIntent(rawQuery: string): QueryIntentFamily {
  const norm = normalizeQueryString(rawQuery);
  const tokens = norm.split(' ');

  const hasPack = RETAIL_PACK_REGEX.test(rawQuery);
  const hasB2BToken = tokens.some((t) => B2B_TOKENS.has(t));
  const hasLocalToken = tokens.some((t) => LOCAL_SOJAT_TOKENS.has(t));
  const isInformational = INFORMATIONAL_REGEX.test(rawQuery);

  // 1. Pack size strongly anchors to Retail Intent unless an explicit bulk quantity (e.g. 50kg)
  if (hasPack) {
    const isHeavyBulkPack = /\b(\d{2,}\s*kg|\d{3,}\s*(ltr|litre))\b/i.test(rawQuery);
    if (isHeavyBulkPack || hasB2BToken) {
      return 'B2B';
    }
    return 'RETAIL';
  }

  // 2. Explicit B2B Wholesale tokens
  if (hasB2BToken) {
    return 'B2B';
  }

  // 3. Local origin intent
  if (hasLocalToken) {
    return 'LOCAL';
  }

  // 4. Informational / Practical how-to intent
  if (isInformational) {
    return 'INFORMATIONAL';
  }

  // 5. Problem / Application intent
  for (const p of PROBLEM_USE_CASE_TOKENS) {
    if (norm.includes(p)) {
      return 'PROBLEM_USE_CASE';
    }
  }

  return 'RETAIL';
}

// ============================================================
// 4. QUERY CLUSTERING ENGINE
// ============================================================

export function clusterSearchQuery(params: {
  rawQuery: string;
  products: Product[];
  categories?: Category[];
  guides?: ProductGuide[];
}): QueryCluster {
  const { rawQuery, products, categories = [], guides = [] } = params;
  const canonicalQuery = rawQuery.trim().toLowerCase();
  const normalizedQuery = normalizeQueryString(rawQuery);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  const intent = classifyQueryIntent(rawQuery);
  const entity = resolveBotanicalEntity(normalizedQuery);

  // Location Signal
  let locationSignal: LocationSignal = null;
  if (tokens.includes('sojat') || tokens.includes('pali')) {
    locationSignal = 'SOJAT';
  } else if (tokens.includes('rajasthan') || tokens.includes('rajasthani')) {
    locationSignal = 'RAJASTHAN';
  } else if (tokens.includes('india') || tokens.includes('national')) {
    locationSignal = 'PAN_INDIA';
  }

  // Commercial Signal
  let commercialSignal: CommercialSignalLevel = 'LOW';
  if (intent === 'B2B' || tokens.some((t) => ['price', 'rate', 'cost', 'buy', 'order', 'shop', 'online'].includes(t))) {
    commercialSignal = intent === 'B2B' ? 'HIGH' : 'MEDIUM';
  }

  // Active items
  const activeProducts = (products || []).filter((p) => p.isActive !== false);
  const activeCategories = (categories || []).filter((c) => c.isActive !== false);
  const activeGuides = (guides || []).filter((g) => g.published !== false);

  // Determine recommended destination
  let recommendedDestination = '/products';
  let destinationType: QueryCluster['destinationType'] = 'SEARCH';
  let acquisitionPriority: QueryCluster['acquisitionPriority'] = 'P2_NEXT';
  let matchedEntityId: string | undefined;
  let matchedEntityName: string | undefined;

  // 1. Strong B2B Wholesale
  if (intent === 'B2B') {
    recommendedDestination = '/wholesale';
    destinationType = 'WHOLESALE';
    acquisitionPriority = 'P1_NOW';
    matchedEntityName = 'Wholesale Portal';
  }
  // 2. Sojat Henna Authority Hub (Local + Henna entity match)
  else if (intent === 'LOCAL' && entity === 'HENNA_MEHNDI') {
    recommendedDestination = '/sojat-henna';
    destinationType = 'SOJAT_HENNA';
    acquisitionPriority = 'P1_NOW';
    matchedEntityName = 'Sojat Henna Authority Hub';
  }
  // 3. Informational Guide
  else if (intent === 'INFORMATIONAL') {
    const matchedGuide = activeGuides.find((g) => {
      const gTitle = (g.title || '').toLowerCase();
      const gSlug = (g.slug || '').toLowerCase();
      return tokens.some((t) => t.length > 3 && (gTitle.includes(t) || gSlug.includes(t)));
    });
    if (matchedGuide) {
      recommendedDestination = `/guides/${matchedGuide.slug}`;
      destinationType = 'GUIDE';
      matchedEntityId = matchedGuide.id;
      matchedEntityName = matchedGuide.title;
      acquisitionPriority = 'P2_NEXT';
    } else {
      recommendedDestination = '/guides';
      destinationType = 'GUIDE';
      acquisitionPriority = 'P3_BACKLOG';
    }
  }
  // 4. Exact Product Match
  else {
    const matchedProduct = activeProducts.find((p) => {
      const pName = (p.name || '').toLowerCase();
      const pSlug = (p.slug || '').replace(/-/g, ' ').toLowerCase();
      return pName === normalizedQuery || pSlug === normalizedQuery || (pName.includes(normalizedQuery) && normalizedQuery.length > 5);
    });

    if (matchedProduct) {
      recommendedDestination = `/products/${matchedProduct.slug}`;
      destinationType = 'PRODUCT';
      matchedEntityId = matchedProduct.id;
      matchedEntityName = matchedProduct.name;
      acquisitionPriority = commercialSignal === 'HIGH' ? 'P1_NOW' : 'P2_NEXT';
    } else {
      // Category Match
      const matchedCat = activeCategories.find((c) => {
        const cName = (c.name || '').toLowerCase();
        return (
          cName.includes(normalizedQuery) ||
          (entity === 'HENNA_MEHNDI' && cName.includes('henna')) ||
          (entity === 'INDIGO' && cName.includes('hair')) ||
          (entity === 'ROSE_WATER' && cName.includes('face'))
        );
      });

      if (matchedCat) {
        recommendedDestination = `/categories/${matchedCat.slug}`;
        destinationType = 'CATEGORY';
        matchedEntityId = matchedCat.id;
        matchedEntityName = matchedCat.name;
        acquisitionPriority = 'P2_NEXT';
      }
    }
  }

  return {
    query: rawQuery,
    canonicalQuery,
    normalizedQuery,
    intent,
    entity,
    locationSignal,
    commercialSignal,
    recommendedDestination,
    destinationType,
    acquisitionPriority,
    matchedEntityId,
    matchedEntityName,
  };
}

// ============================================================
// 5. DETERMINISTIC OPPORTUNITY SCORING (5-FACTOR FRAMEWORK)
// ============================================================

export function calculateDemandOpportunityScore(params: {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  commercialSignal: CommercialSignalLevel;
  hasDestinationPage: boolean;
}): {
  growthScore: number;
  scoreBreakdown: {
    demand: number;
    visibilityGap: number;
    conversionPotential: number;
    commercialValue: number;
    contentReadiness: number;
  };
} {
  const { impressions, clicks, ctr, position, commercialSignal, hasDestinationPage } = params;

  // 1. Demand (25%): Based on real impression volume
  const demand = Math.min(100, Math.round((impressions / 250) * 100));

  // 2. Visibility Gap (25%): Striking distance (pos 4-20) or low CTR on high impressions
  let visibilityGap = 30;
  if (position >= 4 && position <= 20) {
    // Proximity to top 3
    visibilityGap = Math.round(100 - (position - 4) * 4); // pos 4 = 100, pos 20 = 36
  } else if (impressions >= 100 && ctr < 0.03) {
    visibilityGap = 85;
  }

  // 3. Conversion Potential (20%): Historical clicks / CTR
  const conversionPotential = clicks > 0 ? Math.min(100, Math.round(ctr * 1500)) : 40;

  // 4. Commercial Value (20%): Commercial intent signal
  const commercialValue = commercialSignal === 'HIGH' ? 100 : commercialSignal === 'MEDIUM' ? 70 : 40;

  // 5. Content Readiness (10%): Existence of targeted page
  const contentReadiness = hasDestinationPage ? 90 : 25;

  const growthScore = Math.round(
    demand * 0.25 +
    visibilityGap * 0.25 +
    conversionPotential * 0.20 +
    commercialValue * 0.20 +
    contentReadiness * 0.10
  );

  return {
    growthScore: Math.min(100, Math.max(10, growthScore)),
    scoreBreakdown: {
      demand,
      visibilityGap,
      conversionPotential,
      commercialValue,
      contentReadiness,
    },
  };
}

// ============================================================
// 6. OPPORTUNITY DETECTION FROM REAL GSC QUERIES
// ============================================================

export function detectDemandOpportunities(params: {
  gscQueries: SearchConsoleQuery[];
  products: Product[];
  categories?: Category[];
  guides?: ProductGuide[];
}): SeoDemandOpportunity[] {
  const { gscQueries, products, categories = [], guides = [] } = params;
  const opportunities: SeoDemandOpportunity[] = [];
  const seenQueryMap = new Map<string, SearchConsoleQuery[]>();

  // Group queries to check for cannibalization
  for (const g of gscQueries) {
    const qNorm = normalizeQueryString(g.query);
    if (!qNorm) continue;
    const existing = seenQueryMap.get(qNorm) || [];
    existing.push(g);
    seenQueryMap.set(qNorm, existing);
  }

  for (const [normQ, queryRows] of seenQueryMap.entries()) {
    const primaryRow = queryRows[0];
    const totalImpressions = queryRows.reduce((acc, r) => acc + r.impressions, 0);
    const totalClicks = queryRows.reduce((acc, r) => acc + r.clicks, 0);
    const avgPosition = Number((queryRows.reduce((acc, r) => acc + r.position, 0) / queryRows.length).toFixed(1));
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    const cluster = clusterSearchQuery({
      rawQuery: primaryRow.query,
      products,
      categories,
      guides,
    });

    const hasDestination = cluster.destinationType !== 'SEARCH';
    const landingPage = primaryRow.page || '';

    const { growthScore, scoreBreakdown } = calculateDemandOpportunityScore({
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: avgCtr,
      position: avgPosition,
      commercialSignal: cluster.commercialSignal,
      hasDestinationPage: hasDestination,
    });

    const now = new Date().toISOString();

    // ------------------------------------------------------------
    // A. CANNIBALIZATION DETECTION (Multiple distinct ranking URLs)
    // ------------------------------------------------------------
    const distinctUrls = Array.from(new Set(queryRows.map((r) => r.page).filter(Boolean)));
    if (distinctUrls.length >= 2 && totalImpressions >= 20) {
      opportunities.push({
        id: `opp_cannibal_${normQ.replace(/[^a-z0-9]/g, '_')}`,
        type: 'CANNIBALIZATION',
        title: `Search Cannibalization: "${primaryRow.query}" across ${distinctUrls.length} URLs`,
        description: `The query "${primaryRow.query}" is currently splitting Google impressions across multiple pages (${distinctUrls.join(', ')}). Consolidating canonical intent to ${cluster.recommendedDestination} will strengthen organic ranking.`,
        priority: 'P1_NOW',
        growthScore,
        scoreBreakdown,
        query: primaryRow.query,
        cluster,
        gscMetrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: avgCtr,
          position: avgPosition,
          landingPage: distinctUrls[0],
        },
        recommendation: {
          query: primaryRow.query,
          intent: cluster.intent,
          currentUrl: distinctUrls.join(', '),
          recommendedAction: 'RESOLVE_CANNIBALIZATION',
          targetUrl: cluster.recommendedDestination,
          reason: `Observed ${distinctUrls.length} pages competing in Google Search Console for "${primaryRow.query}" with ${totalImpressions} total impressions.`,
          expectedOutcome: 'Hypothesis: Consolidating canonical signals will eliminate internal competition and lift average position towards top 3.',
        },
        status: 'NEW',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // ------------------------------------------------------------
    // B. QUERY-DESTINATION MISMATCH (B2B query landing on retail PDP)
    // ------------------------------------------------------------
    if (cluster.intent === 'B2B' && landingPage && !landingPage.includes('/wholesale')) {
      opportunities.push({
        id: `opp_mismatch_${normQ.replace(/[^a-z0-9]/g, '_')}`,
        type: 'QUERY_DESTINATION_MISMATCH',
        title: `B2B Intent Mismatch: "${primaryRow.query}" landing on Retail Page`,
        description: `Customer is searching with B2B commercial intent ("${primaryRow.query}") but landing on retail URL (${landingPage}). Redirecting or adding a prominent Wholesale Savings CTA will prevent lead abandonment.`,
        priority: 'P1_NOW',
        growthScore,
        scoreBreakdown,
        query: primaryRow.query,
        cluster,
        gscMetrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: avgCtr,
          position: avgPosition,
          landingPage,
        },
        recommendation: {
          query: primaryRow.query,
          intent: 'B2B',
          currentUrl: landingPage,
          recommendedAction: 'ROUTE_TO_WHOLESALE',
          targetUrl: '/wholesale',
          reason: `Commercial wholesale search query currently lands on retail page ${landingPage}.`,
          expectedOutcome: 'Hypothesis: Guiding bulk buyers to /wholesale will increase wholesale lead submissions and higher average order value.',
        },
        status: 'NEW',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // ------------------------------------------------------------
    // C. HIGH IMPRESSION + LOW CTR
    // ------------------------------------------------------------
    if (totalImpressions >= 50 && avgCtr < 0.03) {
      opportunities.push({
        id: `opp_low_ctr_${normQ.replace(/[^a-z0-9]/g, '_')}`,
        type: 'HIGH_IMPRESSION_LOW_CTR',
        title: `Low CTR on High-Impression Query: "${primaryRow.query}" (${totalImpressions} Impr, ${(avgCtr * 100).toFixed(1)}% CTR)`,
        description: `Query "${primaryRow.query}" receives ${totalImpressions} search impressions on Google, but only ${(avgCtr * 100).toFixed(1)}% CTR. Rewriting the meta title and snippet with botanical trust badges and pack clarity will capture more clicks.`,
        priority: 'P1_NOW',
        growthScore,
        scoreBreakdown,
        query: primaryRow.query,
        cluster,
        gscMetrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: avgCtr,
          position: avgPosition,
          landingPage,
        },
        recommendation: {
          query: primaryRow.query,
          intent: cluster.intent,
          currentUrl: landingPage || cluster.recommendedDestination,
          recommendedAction: 'OPTIMIZE_TITLE',
          targetUrl: cluster.recommendedDestination,
          reason: `Google Search Console shows ${totalImpressions} impressions at position #${avgPosition} with low ${(avgCtr * 100).toFixed(1)}% click-through rate.`,
          expectedOutcome: 'Hypothesis: Enhancing title tag and meta snippet could increase organic CTR to 3-5% without requiring higher ranking.',
        },
        status: 'NEW',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // ------------------------------------------------------------
    // D. STRIKING DISTANCE (Position 4 - 20 with >= 20 impressions)
    // ------------------------------------------------------------
    if (avgPosition >= 4.0 && avgPosition <= 20.0 && totalImpressions >= 20) {
      opportunities.push({
        id: `opp_strike_${normQ.replace(/[^a-z0-9]/g, '_')}`,
        type: 'STRIKING_DISTANCE',
        title: `Striking Distance #${avgPosition}: "${primaryRow.query}" (${totalImpressions} Impr)`,
        description: `Query ranks on Google at position #${avgPosition}. Optimizing primary keywords, adding contextual internal links, and answering related FAQs will elevate this query to top 3 positions.`,
        priority: avgPosition <= 10 ? 'P1_NOW' : 'P2_NEXT',
        growthScore,
        scoreBreakdown,
        query: primaryRow.query,
        cluster,
        gscMetrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: avgCtr,
          position: avgPosition,
          landingPage,
        },
        recommendation: {
          query: primaryRow.query,
          intent: cluster.intent,
          currentUrl: landingPage || cluster.recommendedDestination,
          recommendedAction: 'IMPROVE_META',
          targetUrl: cluster.recommendedDestination,
          reason: `Google position #${avgPosition} with ${totalImpressions} impressions demonstrates high algorithm affinity close to page 1 top ranking.`,
          expectedOutcome: 'Hypothesis: Adding targeted botanical entity keywords and internal link anchors could lift rank into top 3 positions.',
        },
        status: 'NEW',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // ------------------------------------------------------------
    // E. NO STRONG DESTINATION / CONTENT GAP
    // ------------------------------------------------------------
    if (!hasDestination && totalImpressions >= 15) {
      opportunities.push({
        id: `opp_content_gap_${normQ.replace(/[^a-z0-9]/g, '_')}`,
        type: 'CONTENT_GAP',
        title: `Unmet Search Demand: "${primaryRow.query}" (${totalImpressions} Impr)`,
        description: `Real customer demand exists for "${primaryRow.query}", but no specific product or published educational guide covers this topic adequately.`,
        priority: 'P2_NEXT',
        growthScore,
        scoreBreakdown,
        query: primaryRow.query,
        cluster,
        gscMetrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: avgCtr,
          position: avgPosition,
          landingPage,
        },
        recommendation: {
          query: primaryRow.query,
          intent: cluster.intent,
          currentUrl: landingPage,
          recommendedAction: 'CREATE_APPROVED_CONTENT',
          targetUrl: '/guides',
          reason: `Query has ${totalImpressions} impressions in GSC but falls back to generic catalog search.`,
          expectedOutcome: 'Hypothesis: Publishing an approved educational guide addressing this use case will establish topical authority and capture targeted organic traffic.',
        },
        status: 'NEW',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Sort by growth score descending
  return opportunities.sort((a, b) => b.growthScore - a.growthScore);
}

// ============================================================
// 7. SEO ACTION CENTER AUDIT LOG & SNAPSHOT MANAGEMENT
// ============================================================

export async function getSeoActionRecords(): Promise<SeoActionRecord[]> {
  const siteSettings = await getSiteSettings();
  const logs: SeoActionRecord[] = (siteSettings as any)?.seoActionAuditLogs || [];
  return logs;
}

export async function recordSeoAction(record: SeoActionRecord): Promise<SeoActionRecord> {
  const siteSettings = await getSiteSettings();
  const existingLogs: SeoActionRecord[] = (siteSettings as any)?.seoActionAuditLogs || [];

  // Idempotency check: prevent applying duplicate action with same key
  const existingIdx = existingLogs.findIndex((log) => log.idempotentKey === record.idempotentKey);
  let updatedLogs: SeoActionRecord[];

  if (existingIdx >= 0) {
    updatedLogs = [...existingLogs];
    updatedLogs[existingIdx] = {
      ...existingLogs[existingIdx],
      ...record,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updatedLogs = [record, ...existingLogs].slice(0, 100); // keep last 100 audit actions
  }

  await updateSiteSettings({ seoActionAuditLogs: updatedLogs } as any);
  return record;
}

// ============================================================
// 8. PHASE 8: CLASSIFY GSC OPPORTUNITY
// ============================================================

export function classifyGscOpportunity(
  row: GscSearchRow,
  preferredDestination?: string,
  thresholds: GscOpportunityThresholds = DEFAULT_GSC_THRESHOLDS
): SeoDemandOpportunityType | null {
  const mergedThresholds = { ...DEFAULT_GSC_THRESHOLDS, ...thresholds };
  const normQ = normalizeQueryString(row.query);
  const page = (row.page || '').trim();

  // 1. Explicit CANNIBALIZATION flag from multi-row scan
  if (row.opportunityType === 'CANNIBALIZATION') {
    return 'CANNIBALIZATION';
  }

  // 2. DESTINATION_MISMATCH / QUERY_DESTINATION_MISMATCH
  if (preferredDestination && page) {
    const cleanPref = preferredDestination.replace(/\/$/, '');
    const cleanPage = page.replace(/\/$/, '');
    if (cleanPref !== cleanPage) {
      const isB2bMismatch = (normQ.includes('wholesale') || normQ.includes('bulk')) && !cleanPage.includes('/wholesale');
      const isHubMismatch = normQ.includes('sojat') && !cleanPage.includes('/sojat-henna') && !cleanPage.includes('/categories/');
      if (isB2bMismatch || isHubMismatch || (preferredDestination.startsWith('/categories/') && cleanPage.startsWith('/products/'))) {
        return 'DESTINATION_MISMATCH';
      }
    }
  }

  // 3. NO_STRONG_DESTINATION
  const cleanLanding = page.replace(/^https?:\/\/[^/]+/, '');
  if (cleanLanding === '/products' || cleanLanding === '/products/' || cleanLanding.includes('/search') || (!page && row.impressions >= 10)) {
    const isInformational = INFORMATIONAL_REGEX.test(row.query) || normQ.includes('how to') || normQ.includes('benefits') || normQ.includes('uses');
    if (isInformational && row.impressions >= mergedThresholds.minContentGapImpressions) {
      return 'CONTENT_GAP';
    }
    return 'NO_STRONG_DESTINATION';
  }

  // 4. CONTENT_GAP
  const isInformational = INFORMATIONAL_REGEX.test(row.query) || normQ.includes('how to') || normQ.includes('benefits') || normQ.includes('uses');
  if (isInformational && row.impressions >= mergedThresholds.minContentGapImpressions) {
    return 'CONTENT_GAP';
  }

  // 5. HIGH_IMPRESSION_LOW_CTR
  if (
    row.impressions >= mergedThresholds.minImpressionsLowCtr &&
    row.ctr < mergedThresholds.maxCtrLowCtr
  ) {
    return 'HIGH_IMPRESSION_LOW_CTR';
  }

  // 6. STRIKING_DISTANCE
  if (
    row.position >= mergedThresholds.minStrikingPosition &&
    row.position <= mergedThresholds.maxStrikingPosition &&
    row.impressions >= mergedThresholds.minStrikingImpressions
  ) {
    return 'STRIKING_DISTANCE';
  }

  // 7. HIGH_COMMERCIAL_INTENT
  const commercialTokens = ['buy', 'price', 'rate', 'cost', 'order', 'wholesale', 'bulk', 'supplier', 'kg', 'online'];
  const hasCommercial = commercialTokens.some((t) => normQ.includes(t));
  if (hasCommercial && row.impressions >= 10) {
    return 'HIGH_COMMERCIAL_INTENT';
  }

  // 8. CONVERSION_GAP
  if (row.clicks >= 5 && row.impressions >= 50) {
    return 'CONVERSION_GAP';
  }

  return null;
}

// ============================================================
// 9. PHASE 8: PRODUCT QUERY MATCHING
// ============================================================

export function matchProductQuery(query: string, products: Product[]): ProductQueryMatchResult {
  const normQuery = normalizeQueryString(query);
  if (!normQuery) {
    return {
      matchType: 'UNRESOLVED',
      product: null,
      targetUrl: '/products',
      confidence: 0,
    };
  }

  const activeProducts = products.filter((p) => p.isActive !== false);

  // 1. EXACT MATCH: normalized title === normQuery or slug === normQuery
  for (const p of activeProducts) {
    const normTitle = normalizeQueryString(p.name || '');
    const normSlug = normalizeQueryString(p.slug || '');
    if (normTitle === normQuery || normSlug === normQuery) {
      return {
        matchType: 'EXACT_MATCH',
        product: p,
        targetUrl: `/products/${p.slug}`,
        confidence: 1.0,
        matchedField: normTitle === normQuery ? 'title' : 'slug',
      };
    }
  }

  // 2. VARIANT MATCH: product title + variant token (e.g. 100g, 250g, 1kg, etc.)
  const packMatch = normQuery.match(/\b(\d+\s*(?:g|gm|gms|gram|grams|kg|ml|ltr|litre|cones?))\b/i);
  for (const p of activeProducts) {
    const normTitle = normalizeQueryString(p.name || '');
    const titleWithoutBrand = normTitle.replace(/musky\s*dose|musky/g, '').trim();
    const queryWithoutPack = normQuery.replace(/\b(\d+\s*(?:g|gm|gms|gram|grams|kg|ml|ltr|litre|cones?))\b/gi, '').replace(/\s+/g, ' ').trim();

    if (packMatch && (queryWithoutPack === normTitle || queryWithoutPack === titleWithoutBrand)) {
      return {
        matchType: 'VARIANT_MATCH',
        product: p,
        targetUrl: `/products/${p.slug}`,
        confidence: 0.95,
        matchedField: 'title',
      };
    }
  }

  // 3. PARTIAL MATCH: significant title words match
  let bestMatch: { product: Product; score: number } | null = null;
  const queryTokens = new Set(normQuery.split(' ').filter((t) => t.length > 2));

  for (const p of activeProducts) {
    const normTitle = normalizeQueryString(p.name || '');
    const titleTokens = normTitle.split(' ').filter((t) => t.length > 2 && t !== 'musky' && t !== 'dose');
    if (titleTokens.length === 0) continue;

    let matchCount = 0;
    for (const t of titleTokens) {
      if (queryTokens.has(t)) {
        matchCount++;
      }
    }

    const score = matchCount / titleTokens.length;
    if ((score >= 0.6 && matchCount >= 2) || normQuery.includes(normTitle)) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { product: p, score };
      }
    }
  }

  if (bestMatch) {
    return {
      matchType: 'PARTIAL_MATCH',
      product: bestMatch.product,
      targetUrl: `/products/${bestMatch.product.slug}`,
      confidence: Number((0.75 + bestMatch.score * 0.2).toFixed(2)),
      matchedField: 'title',
    };
  }

  return {
    matchType: 'UNRESOLVED',
    product: null,
    targetUrl: '/products',
    confidence: 0,
  };
}

// ============================================================
// 10. PHASE 8: HENNA SEARCH CLUSTER
// ============================================================

export function buildHennaSearchCluster(gscRows: GscSearchRow[] = []): HennaSearchCluster {
  const hennaAliases = ['henna', 'mehndi', 'mehendi', 'mehandi', 'heena', 'hina', 'lawsonia'];

  const matchingRows = gscRows.filter((r) => {
    const q = normalizeQueryString(r.query);
    return hennaAliases.some((a) => q.includes(a));
  });

  if (matchingRows.length === 0) {
    return {
      canonicalEntityKey: 'HENNA_MEHNDI',
      canonicalName: 'Henna / Mehndi',
      totalQueries: 0,
      totalImpressions: 0,
      totalClicks: 0,
      averageCtr: 0,
      averagePosition: 0,
      subClusters: [
        {
          subIntent: 'HAIR',
          label: 'Henna for Hair Care & Natural Coloring',
          recommendedDestination: '/categories/henna',
          queries: [],
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
          averagePosition: 0,
        },
        {
          subIntent: 'BRIDAL_BODY_ART',
          label: 'Bridal & Body Art Mehndi',
          recommendedDestination: '/categories/henna',
          queries: [],
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
          averagePosition: 0,
        },
        {
          subIntent: 'SOJAT_ORIGIN',
          label: 'Sojat Origin & Heritage Henna',
          recommendedDestination: '/sojat-henna',
          queries: [],
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
          averagePosition: 0,
        },
        {
          subIntent: 'WHOLESALE_BULK',
          label: 'Wholesale & Commercial Bulk Henna',
          recommendedDestination: '/wholesale',
          queries: [],
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
          averagePosition: 0,
        },
        {
          subIntent: 'GENERAL_CATEGORY',
          label: 'General Pure Henna / Mehndi Category',
          recommendedDestination: '/categories/henna',
          queries: [],
          totalImpressions: 0,
          totalClicks: 0,
          averageCtr: 0,
          averagePosition: 0,
        },
      ],
      dataStatus: 'DATA_NOT_AVAILABLE',
    };
  }

  const totalQueries = matchingRows.length;
  const totalImpressions = matchingRows.reduce((acc, r) => acc + (r.impressions || 0), 0);
  const totalClicks = matchingRows.reduce((acc, r) => acc + (r.clicks || 0), 0);
  const averageCtr = totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0;
  const weightedPosSum = matchingRows.reduce((acc, r) => acc + (r.position || 0) * (r.impressions || 1), 0);
  const totalWeight = matchingRows.reduce((acc, r) => acc + (r.impressions || 1), 0);
  const averagePosition = totalWeight > 0 ? Number((weightedPosSum / totalWeight).toFixed(1)) : 0;

  const subClusterMap: Record<HennaSubCluster['subIntent'], GscSearchRow[]> = {
    WHOLESALE_BULK: [],
    SOJAT_ORIGIN: [],
    HAIR: [],
    BRIDAL_BODY_ART: [],
    GENERAL_CATEGORY: [],
  };

  for (const row of matchingRows) {
    const q = normalizeQueryString(row.query);
    if (q.includes('wholesale') || q.includes('bulk') || q.includes('supplier') || q.includes('kg') || q.includes('trade')) {
      subClusterMap.WHOLESALE_BULK.push(row);
    } else if (q.includes('sojat') || q.includes('rajasthan') || q.includes('pali')) {
      subClusterMap.SOJAT_ORIGIN.push(row);
    } else if (q.includes('hair') || q.includes('grey') || q.includes('gray') || q.includes('scalp') || q.includes('condition')) {
      subClusterMap.HAIR.push(row);
    } else if (q.includes('bridal') || q.includes('cone') || q.includes('body art') || q.includes('hand') || q.includes('baq') || q.includes('stain')) {
      subClusterMap.BRIDAL_BODY_ART.push(row);
    } else {
      subClusterMap.GENERAL_CATEGORY.push(row);
    }
  }

  const buildSub = (
    subIntent: HennaSubCluster['subIntent'],
    label: string,
    recommendedDestination: string
  ): HennaSubCluster => {
    const rows = subClusterMap[subIntent];
    const imp = rows.reduce((acc, r) => acc + (r.impressions || 0), 0);
    const clk = rows.reduce((acc, r) => acc + (r.clicks || 0), 0);
    const ctr = imp > 0 ? Number((clk / imp).toFixed(4)) : 0;
    const wSum = rows.reduce((acc, r) => acc + (r.position || 0) * (r.impressions || 1), 0);
    const wTot = rows.reduce((acc, r) => acc + (r.impressions || 1), 0);
    const pos = wTot > 0 ? Number((wSum / wTot).toFixed(1)) : 0;

    return {
      subIntent,
      label,
      recommendedDestination,
      queries: rows.map((r) => r.query),
      totalImpressions: imp,
      totalClicks: clk,
      averageCtr: ctr,
      averagePosition: pos,
    };
  };

  const subClusters: HennaSubCluster[] = [
    buildSub('HAIR', 'Henna for Hair Care & Natural Coloring', '/categories/henna'),
    buildSub('BRIDAL_BODY_ART', 'Bridal & Body Art Mehndi', '/categories/henna'),
    buildSub('SOJAT_ORIGIN', 'Sojat Origin & Heritage Henna', '/sojat-henna'),
    buildSub('WHOLESALE_BULK', 'Wholesale & Commercial Bulk Henna', '/wholesale'),
    buildSub('GENERAL_CATEGORY', 'General Pure Henna / Mehndi Category', '/categories/henna'),
  ];

  return {
    canonicalEntityKey: 'HENNA_MEHNDI',
    canonicalName: 'Henna / Mehndi',
    totalQueries,
    totalImpressions,
    totalClicks,
    averageCtr,
    averagePosition,
    subClusters,
    dataStatus: 'DATA_AVAILABLE',
  };
}

// ============================================================
// 11. PHASE 8: MANUAL SEO LOCK SAFEGUARD
// ============================================================

export function isManualSeoLocked(target: {
  isManualSeoLocked?: boolean;
  seoManualOverride?: boolean;
  isManualLocked?: boolean;
  seoLocked?: boolean;
  [key: string]: any;
}): boolean {
  if (!target) return false;
  return Boolean(
    target.isManualSeoLocked ||
    target.seoManualOverride ||
    target.isManualLocked ||
    target.seoLocked
  );
}
