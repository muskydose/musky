import { Product, Category } from '@/lib/types';
import {
  GrowthKeyword,
  SearchConsoleQuery,
  ProductKeywordUniverse,
  ProductSeoHealthScore,
  ProductSeoRating,
  GrowthOpportunity,
  GrowthOpportunityPriority,
  GrowthOpportunityType,
  GrowthOpportunityAction,
  InternalLinkSuggestion,
  MarketProductMapping,
  OpportunityDashboardStats,
} from './types';
import { generateProductKeywordUniverse } from './product-keyword-engine';
import { getOrdersForAnalytics } from '@/lib/db/orders';

// ============================================================
// 1. PRODUCT COMPLETENESS AUDIT
// ============================================================

export interface ProductCompletenessAudit {
  score: number; // 0-100
  isComplete: boolean;
  missingFields: string[];
  presentFieldsCount: number;
  totalFieldsCount: number;
}

export function auditProductCompleteness(product: Product): ProductCompletenessAudit {
  const missingFields: string[] = [];
  const requiredChecks: { name: string; test: () => boolean }[] = [
    { name: 'Product Name', test: () => Boolean(product.name?.trim()) },
    { name: 'URL Slug', test: () => Boolean(product.slug?.trim()) },
    { name: 'Category', test: () => Boolean(product.categoryId?.trim() || product.categoryName?.trim()) },
    { name: 'Price', test: () => typeof product.price === 'number' && product.price > 0 },
    { name: 'SKU Identifier', test: () => Boolean(product.sku?.trim()) },
    { name: 'Short Description', test: () => Boolean(product.shortDescription && product.shortDescription.trim().length >= 20) },
    { name: 'Full Description', test: () => Boolean(product.fullDescription && product.fullDescription.trim().length >= 40) },
    { name: 'Botanical Ingredients', test: () => Boolean(product.ingredients && (Array.isArray(product.ingredients) ? product.ingredients.length > 0 : String(product.ingredients).trim().length > 0)) },
    { name: 'Product Benefits', test: () => Boolean(product.benefits && (Array.isArray(product.benefits) ? product.benefits.length > 0 : String(product.benefits).trim().length > 0)) },
    { name: 'Usage Instructions', test: () => Boolean(product.usageInstructions && product.usageInstructions.trim().length >= 15) },
    { name: 'Product Images', test: () => Boolean(product.images && (Array.isArray(product.images) ? product.images.length > 0 : String(product.images).trim().length > 0)) },
    { name: 'Stock Status', test: () => Boolean(product.stockStatus) },
    { name: 'SEO Meta Title', test: () => Boolean(product.seoTitle && product.seoTitle.trim().length >= 20) },
    { name: 'SEO Meta Description', test: () => Boolean(product.seoDescription && product.seoDescription.trim().length >= 50) },
  ];

  let present = 0;
  for (const check of requiredChecks) {
    if (check.test()) {
      present++;
    } else {
      missingFields.push(check.name);
    }
  }

  const score = Math.round((present / requiredChecks.length) * 100);
  return {
    score,
    isComplete: missingFields.length === 0,
    missingFields,
    presentFieldsCount: present,
    totalFieldsCount: requiredChecks.length,
  };
}

// ============================================================
// 2. PRODUCT SEO HEALTH SCORE ENGINE
// ============================================================

export function calculateProductSeoHealth(
  product: Product,
  universe?: ProductKeywordUniverse,
  verifiedKeywords: GrowthKeyword[] = []
): ProductSeoHealthScore {
  const completeness = auditProductCompleteness(product);
  const uv = universe || generateProductKeywordUniverse(product, verifiedKeywords);

  const seoTitle = (product.seoTitle || '').trim();
  const seoDesc = (product.seoDescription || '').trim();
  const seoKw = (product.seoKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);

  const hasSeoTitle = seoTitle.length > 0;
  const hasSeoDescription = seoDesc.length > 0;
  const hasKeywords = seoKw.length > 0;

  // Real length validations (SEO standard: Title 30-65 chars, Desc 120-165 chars)
  const titleLengthValid = seoTitle.length >= 30 && seoTitle.length <= 65;
  const descriptionLengthValid = seoDesc.length >= 120 && seoDesc.length <= 165;

  const hasPrimaryKeyword = Boolean(
    uv.suggestedPrimary &&
      (seoTitle.toLowerCase().includes(uv.suggestedPrimary.toLowerCase()) ||
        product.name.toLowerCase().includes(uv.suggestedPrimary.toLowerCase()) ||
        seoKw.includes(uv.suggestedPrimary.toLowerCase()))
  );

  // Metadata Score (0-100)
  let metaScore = 0;
  if (hasSeoTitle) metaScore += 30;
  if (titleLengthValid) metaScore += 15;
  if (hasSeoDescription) metaScore += 30;
  if (descriptionLengthValid) metaScore += 15;
  if (hasKeywords) metaScore += 10;

  // Keyword Universe Depth Score (0-100)
  let kwDepthScore = 0;
  if (uv.totalKeywords >= 30) kwDepthScore += 40;
  else kwDepthScore += Math.round((uv.totalKeywords / 30) * 40);

  if (uv.suggestedLongTail.length >= 5) kwDepthScore += 30;
  else kwDepthScore += Math.round((uv.suggestedLongTail.length / 5) * 30);

  if (uv.suggestedQuestions.length >= 3) kwDepthScore += 30;
  else kwDepthScore += Math.round((uv.suggestedQuestions.length / 3) * 30);

  // Demand Match Score (0-100)
  let demandMatchScore = 0;
  if (uv.verifiedCount > 0) {
    demandMatchScore = Math.min(100, uv.verifiedCount * 25);
  } else {
    // If no verified CSV match yet, derive baseline fit from root botanical
    demandMatchScore = uv.totalKeywords > 20 ? 50 : 30;
  }

  // Weighted Overall SEO Health Score
  // 35% Metadata Quality + 30% Product Completeness + 20% Keyword Universe + 15% Demand Matching
  const overallScore = Math.round(
    metaScore * 0.35 + completeness.score * 0.3 + kwDepthScore * 0.2 + demandMatchScore * 0.15
  );

  let rating: ProductSeoRating = 'NEEDS_WORK';
  if (overallScore >= 80) {
    rating = 'EXCELLENT';
  } else if (overallScore >= 60) {
    rating = 'GOOD';
  }

  // Actionable Recommendations
  const recommendations: string[] = [];
  if (!hasSeoTitle) {
    recommendations.push(`Add a targeted SEO Meta Title including "${uv.suggestedPrimary}" (30–65 chars).`);
  } else if (!titleLengthValid) {
    recommendations.push(`Optimize SEO Title length (currently ${seoTitle.length} chars, ideal is 30–65 chars).`);
  }

  if (!hasSeoDescription) {
    recommendations.push('Add an SEO Meta Description detailing pure botanical origin, usage, and purity.');
  } else if (!descriptionLengthValid) {
    recommendations.push(`Adjust SEO Description length (currently ${seoDesc.length} chars, ideal is 120–165 chars).`);
  }

  if (!hasPrimaryKeyword && uv.suggestedPrimary) {
    recommendations.push(`Target suggested primary keyword: "${uv.suggestedPrimary}" in title or description.`);
  }

  if (completeness.missingFields.length > 0) {
    recommendations.push(`Complete missing product fields: ${completeness.missingFields.slice(0, 3).join(', ')}.`);
  }

  if (uv.suggestedQuestions.length > 0) {
    recommendations.push(`Create supporting FAQ for high-intent query: "${uv.suggestedQuestions[0]}".`);
  }

  return {
    productId: product.id,
    productName: product.name,
    overallScore,
    rating,
    completenessScore: completeness.score,
    metadataScore: metaScore,
    keywordCoverageScore: kwDepthScore,
    demandMatchScore,
    breakdown: {
      hasPrimaryKeyword,
      hasSeoTitle,
      hasSeoDescription,
      hasKeywords,
      titleLengthValid,
      descriptionLengthValid,
      completenessMissingFields: completeness.missingFields,
      keywordUniverseCount: uv.totalKeywords,
      verifiedDemandCount: uv.verifiedCount,
      longTailCount: uv.suggestedLongTail.length,
      questionCount: uv.suggestedQuestions.length,
      imageCount: product.images?.length || 0,
    },
    recommendations,
    lastReviewedAt: new Date().toISOString(),
  };
}

// ============================================================
// 3. AUTO-INTERNAL LINKING SUGGESTIONS
// ============================================================

export function generateProductInternalLinks(
  product: Product,
  allProducts: Product[],
  categories: Category[] = []
): InternalLinkSuggestion[] {
  const suggestions: InternalLinkSuggestion[] = [];
  const pNameLower = product.name.toLowerCase();
  const pCatLower = (product.categoryName || '').toLowerCase();
  const rawIng: any = product.ingredients;
  const pIngStr = Array.isArray(rawIng)
    ? rawIng.join(' ').toLowerCase()
    : typeof rawIng === 'string'
    ? rawIng.toLowerCase()
    : '';

  // 1. Link to Parent Category
  const cat = categories.find((c) => c.id === product.categoryId || c.name.toLowerCase() === pCatLower);
  if (cat) {
    suggestions.push({
      id: `link_cat_${product.id}_${cat.id}`,
      sourceProductId: product.id,
      sourceProductName: product.name,
      targetType: 'CATEGORY',
      targetTitle: `${cat.name} Collection`,
      targetUrl: `/categories`,
      anchorText: `Explore our 100% Pure ${cat.name} Collection`,
      relevanceReason: `Category authority link to full ${cat.name} line`,
      relevanceScore: 95,
    });
  }

  // 2. Complementary Product Links (Botanical Pairing)
  const isHenna = pNameLower.includes('henna') || pCatLower.includes('henna') || pIngStr.includes('lawsonia');
  const isIndigo = pNameLower.includes('indigo') || pIngStr.includes('indigo');
  const isHairPack = pNameLower.includes('hair pack') || pNameLower.includes('amla') || pNameLower.includes('shikakai');
  const isRoseWater = pNameLower.includes('rose water') || pIngStr.includes('rose');

  for (const other of allProducts) {
    if (other.id === product.id || other.isActive === false) continue;
    const otherNameLower = other.name.toLowerCase();

    // Henna + Indigo synergy (2-step natural black dye)
    if (isHenna && (otherNameLower.includes('indigo') || other.id === 'prod-2')) {
      suggestions.push({
        id: `link_pair_${product.id}_${other.id}`,
        sourceProductId: product.id,
        sourceProductName: product.name,
        targetType: 'PRODUCT',
        targetTitle: other.name,
        targetUrl: `/products/${other.slug}`,
        anchorText: `Pair with Organic Indigo Powder for rich 100% chemical-free dark hair color`,
        relevanceReason: `High-converting botanical synergy for 2-step natural black hair coloring`,
        relevanceScore: 98,
      });
    }

    if (isIndigo && (otherNameLower.includes('henna') || other.id === 'prod-1')) {
      suggestions.push({
        id: `link_pair_${product.id}_${other.id}`,
        sourceProductId: product.id,
        sourceProductName: product.name,
        targetType: 'PRODUCT',
        targetTitle: other.name,
        targetUrl: `/products/${other.slug}`,
        anchorText: `Apply after pure Sojat Henna base for deepest natural hair coverage`,
        relevanceReason: `Essential 2-step natural hair coloring partner`,
        relevanceScore: 98,
      });
    }

    // Henna/Hair Pack + Rose Water synergy (Mixing liquid)
    if ((isHenna || isHairPack) && (otherNameLower.includes('rose') || other.id === 'prod-5')) {
      suggestions.push({
        id: `link_pair_${product.id}_${other.id}`,
        sourceProductId: product.id,
        sourceProductName: product.name,
        targetType: 'PRODUCT',
        targetTitle: other.name,
        targetUrl: `/products/${other.slug}`,
        anchorText: `Mix with Pure Damask Rose Water Spray for enhanced aroma and scalp hydration`,
        relevanceReason: `Natural formulation pairing for powder mixing and conditioning`,
        relevanceScore: 90,
      });
    }

    // Hair Pack + Henna synergy
    if (isHairPack && otherNameLower.includes('henna') && !suggestions.some((s) => s.targetUrl.includes(other.slug))) {
      suggestions.push({
        id: `link_pair_${product.id}_${other.id}`,
        sourceProductId: product.id,
        sourceProductName: product.name,
        targetType: 'PRODUCT',
        targetTitle: other.name,
        targetUrl: `/products/${other.slug}`,
        anchorText: `Add pure Sojat Henna powder for additional hair strength and conditioning`,
        relevanceReason: `Herbal hair care complementary regimen`,
        relevanceScore: 85,
      });
    }
  }

  // 3. Contextual Botanical Guide Links
  if (isHenna) {
    suggestions.push({
      id: `link_guide_${product.id}_henna_purity`,
      sourceProductId: product.id,
      sourceProductName: product.name,
      targetType: 'GUIDE',
      targetTitle: 'How to Identify Authentic Sojat Henna Purity',
      targetUrl: '/about',
      anchorText: 'Read our guide on Sojat henna harvesting & purity standards',
      relevanceReason: 'Educates buyer on GI-origin quality and chemical-free assurance',
      relevanceScore: 88,
    });
  }

  // 4. Wholesale / Bulk Supply Link
  suggestions.push({
    id: `link_ws_${product.id}`,
    sourceProductId: product.id,
    sourceProductName: product.name,
    targetType: 'WHOLESALE',
    targetTitle: 'Bulk & Salon Wholesale Supply',
    targetUrl: '/wholesale',
    anchorText: 'Inquire for bulk salon quantities and wholesale Sojat supply',
    relevanceReason: 'Direct pipeline for B2B mehndi artists, salons, and distributors',
    relevanceScore: 82,
  });

  return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ============================================================
// 4. KEYWORD → PRODUCT MAPPING
// ============================================================

export function mapKeywordsToProducts(
  keywords: GrowthKeyword[],
  products: Product[]
): MarketProductMapping[] {
  const mappings: MarketProductMapping[] = [];

  for (const kw of keywords) {
    const q = (kw.keyword || '').toLowerCase().trim();
    if (!q) continue;

    const scoredProducts: { product: Product; score: number }[] = [];

    for (const p of products) {
      if (p.isActive === false) continue;
      const pName = p.name.toLowerCase();
      const pCat = (p.categoryName || '').toLowerCase();
      const rawIng: any = p.ingredients;
      const pIng = Array.isArray(rawIng)
        ? rawIng.join(' ').toLowerCase()
        : typeof rawIng === 'string'
        ? rawIng.toLowerCase()
        : '';
      const pDesc = (p.shortDescription || '').toLowerCase();

      let score = 0;
      if (pName.includes(q)) score += 100;
      if (q.includes(pName)) score += 80;

      // Token match
      const tokens = q.split(/\s+/).filter((t) => t.length > 2);
      for (const t of tokens) {
        if (pName.includes(t)) score += 25;
        if (pIng.includes(t)) score += 20;
        if (pCat.includes(t)) score += 15;
        if (pDesc.includes(t)) score += 10;
      }

      // Specific botanical associations
      if (q.includes('henna') || q.includes('mehndi') || q.includes('heena')) {
        if (pName.includes('henna') || pName.includes('mehendi')) score += 40;
      }
      if (q.includes('indigo') || q.includes('dark hair') || q.includes('black hair')) {
        if (pName.includes('indigo')) score += 60;
      }
      if (q.includes('rose') || q.includes('gulab')) {
        if (pName.includes('rose')) score += 60;
      }
      if (q.includes('amla') || q.includes('shikakai') || q.includes('reetha') || q.includes('hair pack')) {
        if (pName.includes('hair pack') || pName.includes('amla')) score += 60;
      }

      if (score >= 35) {
        scoredProducts.push({ product: p, score });
      }
    }

    scoredProducts.sort((a, b) => b.score - a.score);

    const primary = scoredProducts[0]?.product;
    const primaryScore = scoredProducts[0]?.score || 0;

    let actionSuggested: GrowthOpportunityAction = 'OPTIMIZE_PRODUCT';
    if (q.includes('how to') || q.includes('best') || q.includes('benefits') || q.includes('recipe')) {
      actionSuggested = 'CREATE_GUIDE_DRAFT';
    } else if (kw.searchVolume && kw.searchVolume >= 20000) {
      actionSuggested = 'PREPARE_ADS_DRAFT';
    }

    mappings.push({
      keyword: kw.keyword,
      state: kw.state,
      city: kw.city,
      searchVolume: kw.searchVolume ?? null,
      cpc: kw.cpc ?? null,
      competition: kw.competition ?? null,
      primaryProduct: primary
        ? {
            id: primary.id,
            name: primary.name,
            slug: primary.slug,
            categoryName: primary.categoryName || 'Botanicals',
            inStock: primary.stockStatus === 'in_stock',
            relevance: primaryScore,
          }
        : undefined,
      alternativeProducts: scoredProducts.slice(1, 3).map((sp) => ({
        id: sp.product.id,
        name: sp.product.name,
        slug: sp.product.slug,
        categoryName: sp.product.categoryName || 'Botanicals',
        inStock: sp.product.stockStatus === 'in_stock',
        relevance: sp.score,
      })),
      relatedProducts: scoredProducts.slice(3, 5).map((sp) => ({
        id: sp.product.id,
        name: sp.product.name,
        slug: sp.product.slug,
        categoryName: sp.product.categoryName || 'Botanicals',
        inStock: sp.product.stockStatus === 'in_stock',
        relevance: sp.score,
      })),
      businessSignals: {
        orders: 0,
        revenue: 0,
      },
      actionSuggested,
    });
  }

  return mappings;
}

// ============================================================
// 5. DETERMINISTIC GROWTH OPPORTUNITY SCORE (0-100)
// ============================================================

export interface GrowthScoreBreakdown {
  demand: number; // 25% weight
  visibilityGap: number; // 25% weight
  conversionPotential: number; // 20% weight
  commercialValue: number; // 20% weight
  contentReadiness: number; // 10% weight
}

/**
 * Calculates a deterministic 0-100 growth score based on explicit V1 weights:
 * Demand (25%) + Visibility Gap (25%) + Conversion Potential (20%) + Commercial Value (20%) + Content Readiness (10%)
 */
export function calculateGrowthOpportunityScore(
  opp: Partial<GrowthOpportunity>,
  product?: Product
): { growthScore: number; scoreBreakdown: GrowthScoreBreakdown } {
  let demand = 40;
  if (opp.marketDemand?.searchVolume) {
    demand = Math.min(100, Math.max(20, Math.round(Math.log10(opp.marketDemand.searchVolume) * 20)));
  } else if (opp.gscPerformance?.impressions) {
    demand = Math.min(100, Math.max(30, Math.round(opp.gscPerformance.impressions / 5)));
  } else if (opp.type === 'ZERO_RESULT_SEARCH' || opp.type === 'HIGH_DEMAND_UNTARGETED') {
    demand = 85;
  }

  let visibilityGap = 50;
  if (opp.gscPerformance?.position) {
    if (opp.gscPerformance.position >= 5 && opp.gscPerformance.position <= 20) {
      visibilityGap = 90;
    } else if (opp.gscPerformance.position > 20) {
      visibilityGap = 70;
    } else {
      visibilityGap = 40;
    }
  } else if (opp.type === 'METADATA_INCOMPLETE' || opp.type === 'MISSING_GUIDE') {
    visibilityGap = 85;
  } else if (opp.type === 'CANNIBALIZATION_RISK') {
    visibilityGap = 75;
  }

  let conversionPotential = 50;
  if (opp.gscPerformance?.ctr !== undefined && opp.gscPerformance.ctr < 0.03) {
    conversionPotential = 85;
  } else if (opp.type === 'TRAFFIC_LEAK') {
    conversionPotential = 95;
  } else if (opp.type === 'MISSING_IMAGE') {
    conversionPotential = 80;
  }

  let commercialValue = 60;
  if (product?.price) {
    commercialValue = Math.min(100, Math.max(30, Math.round((product.price / 500) * 100)));
  } else if (opp.type === 'OUT_OF_STOCK_RISK') {
    commercialValue = 90;
  }

  let contentReadiness = 50;
  if (product?.shortDescription && product.ingredients?.length) {
    contentReadiness = 80;
  } else if (opp.type === 'METADATA_INCOMPLETE') {
    contentReadiness = 40;
  }

  const growthScore = Math.round(
    demand * 0.25 +
    visibilityGap * 0.25 +
    conversionPotential * 0.20 +
    commercialValue * 0.20 +
    contentReadiness * 0.10
  );

  return {
    growthScore: Math.min(100, Math.max(0, growthScore)),
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
// 6. SEO KEYWORD CANNIBALIZATION DETECTOR
// ============================================================

export function detectKeywordCannibalization(
  products: Product[],
  guides: any[] = []
): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];
  const seenPairs = new Set<string>();

  // Compare products against each other
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const p1 = products[i];
      const p2 = products[j];
      if (p1.isActive === false || p2.isActive === false) continue;

      const p1Keywords = (p1.seoKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);
      const p2Keywords = (p2.seoKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);

      const shared = p1Keywords.filter((k) => p2Keywords.includes(k) && k.length > 5);

      if (shared.length > 0 && !seenPairs.has(`${p1.id}_${p2.id}`)) {
        seenPairs.add(`${p1.id}_${p2.id}`);
        const overlapKw = shared[0];

        const { growthScore, scoreBreakdown } = calculateGrowthOpportunityScore(
          { type: 'CANNIBALIZATION_RISK', keyword: overlapKw },
          p1
        );

        opportunities.push({
          id: `opp_cannibal_${p1.id}_${p2.id}`,
          title: `Cannibalization Alert: "${overlapKw}"`,
          description: `Two active products ("${p1.name}" and "${p2.name}") compete for the same primary target keyword: "${overlapKw}". Differentiate product titles or assign distinct primary search intent to avoid split rankings.`,
          type: 'CANNIBALIZATION_RISK',
          priority: 'P2_NEXT',
          status: 'NEW',
          growthScore,
          scoreBreakdown,
          keyword: overlapKw,
          productId: p1.id,
          productName: p1.name,
          productSlug: p1.slug,
          cannibalizationDetails: {
            conflictingPages: [
              { title: p1.name, url: `/products/${p1.slug}`, intent: 'Transactional' },
              { title: p2.name, url: `/products/${p2.slug}`, intent: 'Transactional' },
            ],
            resolutionSuggestion: `Assign specific pack size or grade modifier to differentiate primary target keywords.`,
          },
          suggestedAction: 'REVIEW_CANNIBALIZATION',
          actionLabel: 'Review & Differentiate Keywords',
          actionLink: `/admin/products/${p1.id}`,
          relevanceScore: 88,
          freshnessStatus: 'Fresh',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return opportunities;
}

// ============================================================
// 7. AUTOMATIC GROWTH OPPORTUNITIES GENERATOR (V1 DETERMINISTIC RULES)
// ============================================================

export function generateGrowthOpportunities(
  products: Product[],
  verifiedKeywords: GrowthKeyword[] = [],
  gscQueries: SearchConsoleQuery[] = [],
  orders: any[] = [],
  guides: any[] = []
): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];
  const seenKeys = new Set<string>();

  // ------------------------------------------------------------
  // RULE A & B. GOOGLE SEARCH CONSOLE OPPORTUNITIES (Low CTR & Striking Distance)
  // ------------------------------------------------------------
  for (const gsc of gscQueries) {
    const qLower = gsc.query.toLowerCase().trim();
    if (!qLower || seenKeys.has(`gsc_${qLower}`)) continue;

    const pos = gsc.position;
    const isStrikingDistance = pos >= 5.0 && pos <= 20.0;
    const isLowCtr = gsc.impressions >= 100 && gsc.ctr < 0.03;

    if (isStrikingDistance || isLowCtr) {
      const matchingProduct = products.find(
        (p) => p.name.toLowerCase().includes(qLower) || p.slug.includes(qLower.replace(/\s+/g, '-'))
      );

      const type: GrowthOpportunityType = isLowCtr ? 'GSC_LOW_CTR' : 'GSC_RANKING_STRIKE';
      const priority: GrowthOpportunityPriority = pos <= 10.0 || isLowCtr ? 'P1_NOW' : 'P2_NEXT';

      const { growthScore, scoreBreakdown } = calculateGrowthOpportunityScore(
        {
          type,
          gscPerformance: {
            impressions: gsc.impressions,
            clicks: gsc.clicks,
            ctr: gsc.ctr,
            position: gsc.position,
          },
        },
        matchingProduct
      );

      seenKeys.add(`gsc_${qLower}`);
      opportunities.push({
        id: `opp_gsc_${Math.random().toString(36).substring(2, 9)}`,
        title: isLowCtr
          ? `Low CTR on High-Impression Query: "${gsc.query}" (${gsc.impressions} Impr, ${(gsc.ctr * 100).toFixed(1)}% CTR)`
          : `Striking Distance #${pos.toFixed(1)}: "${gsc.query}" (${gsc.impressions} Impr)`,
        description: isLowCtr
          ? `Query receives ${gsc.impressions} search impressions but only ${(gsc.ctr * 100).toFixed(1)}% CTR. Rewriting the SEO title and snippet with botanical trust badges will capture more front-page clicks.`
          : `Google Search Console ranking striking distance (Position ${pos.toFixed(1)}). Optimizing metadata and adding an FAQ will push this query to top 3.`,
        type,
        priority,
        status: 'NEW',
        growthScore,
        scoreBreakdown,
        keyword: gsc.query,
        productId: matchingProduct?.id,
        productName: matchingProduct?.name,
        productSlug: matchingProduct?.slug,
        gscPerformance: {
          impressions: gsc.impressions,
          clicks: gsc.clicks,
          ctr: gsc.ctr,
          position: gsc.position,
        },
        suggestedAction: 'OPTIMIZE_PRODUCT',
        actionLabel: 'Optimize SEO Title & Snippet',
        actionLink: matchingProduct ? `/admin/products/${matchingProduct.id}` : undefined,
        relevanceScore: 90,
        freshnessStatus: 'Fresh',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ------------------------------------------------------------
  // RULE C & E. MISSING GUIDE OPPORTUNITIES FOR ACTIVE PRODUCTS
  // ------------------------------------------------------------
  for (const p of products) {
    if (p.isActive === false) continue;

    const hasGuide = guides.some(
      (g) => g.slug.includes(p.slug) || (g.title && g.title.toLowerCase().includes(p.name.toLowerCase()))
    );

    if (!hasGuide && !seenKeys.has(`missing_guide_${p.id}`)) {
      seenKeys.add(`missing_guide_${p.id}`);
      const { growthScore, scoreBreakdown } = calculateGrowthOpportunityScore(
        { type: 'MISSING_GUIDE', keyword: p.name },
        p
      );

      opportunities.push({
        id: `opp_guide_${p.id}`,
        title: `Content Gap: No Guide for "${p.name}"`,
        description: `Active product does not have a dedicated educational guide. Creating an Auto-Guide will capture top-of-funnel informational searches and drive product purchases.`,
        type: 'MISSING_GUIDE',
        priority: 'P2_NEXT',
        status: 'NEW',
        growthScore,
        scoreBreakdown,
        keyword: p.name,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        suggestedAction: 'CREATE_GUIDE_DRAFT',
        actionLabel: 'Generate Auto-Guide',
        actionLink: `/admin/guides`,
        relevanceScore: 88,
        freshnessStatus: 'Fresh',
        createdAt: new Date().toISOString(),
      });
    }

    // ------------------------------------------------------------
    // RULE F. MISSING REAL PRODUCT PHOTOGRAPHY (Fallback Image)
    // ------------------------------------------------------------
    const usesFallbackImage = !p.images || p.images.length === 0 || p.images[0].includes('fallback');
    if (usesFallbackImage && !seenKeys.has(`missing_img_${p.id}`)) {
      seenKeys.add(`missing_img_${p.id}`);
      const { growthScore, scoreBreakdown } = calculateGrowthOpportunityScore(
        { type: 'MISSING_IMAGE', keyword: p.name },
        p
      );

      opportunities.push({
        id: `opp_img_${p.id}`,
        title: `Visual Opportunity: Add Real Image for "${p.name}"`,
        description: `Product currently uses an SVG placeholder image. Uploading genuine product photography increases add-to-cart conversion rate by over 40%.`,
        type: 'MISSING_IMAGE',
        priority: 'P1_NOW',
        status: 'NEW',
        growthScore,
        scoreBreakdown,
        keyword: p.name,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        suggestedAction: 'ADD_PRODUCT_IMAGE',
        actionLabel: 'Upload Product Photos',
        actionLink: `/admin/products/${p.id}`,
        relevanceScore: 94,
        freshnessStatus: 'Fresh',
        createdAt: new Date().toISOString(),
      });
    }

    // ------------------------------------------------------------
    // RULE H. INVENTORY & OUT-OF-STOCK RISK
    // ------------------------------------------------------------
    if (p.stockStatus === 'out_of_stock' && !seenKeys.has(`stock_${p.id}`)) {
      seenKeys.add(`stock_${p.id}`);
      const { growthScore, scoreBreakdown } = calculateGrowthOpportunityScore(
        { type: 'OUT_OF_STOCK_RISK', keyword: p.name },
        p
      );

      opportunities.push({
        id: `opp_stock_${p.id}`,
        title: `Commercial Risk: "${p.name}" is Out of Stock`,
        description: `Active product is marked out of stock. Updating stock status or manufacturing batch prevents lost customer orders.`,
        type: 'OUT_OF_STOCK_RISK',
        priority: 'P1_NOW',
        status: 'NEW',
        growthScore,
        scoreBreakdown,
        keyword: p.name,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        suggestedAction: 'RESTOCK_PRODUCT',
        actionLabel: 'Update Stock Status',
        actionLink: `/admin/products/${p.id}`,
        relevanceScore: 96,
        freshnessStatus: 'Fresh',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ------------------------------------------------------------
  // RULE G. KEYWORD CANNIBALIZATION DETECTION
  // ------------------------------------------------------------
  const cannibalOpps = detectKeywordCannibalization(products, guides);
  opportunities.push(...cannibalOpps);

  // Sort by growthScore descending
  return opportunities.sort((a, b) => (b.growthScore || 0) - (a.growthScore || 0));
}

// ============================================================
// 6. ACTION DRAFT TEMPLATE GENERATOR
// ============================================================

export function generateActionDraftTemplate(
  opportunity: GrowthOpportunity,
  product?: Product
): {
  type: GrowthOpportunityAction;
  title: string;
  markdownContent: string;
  copyableText: string;
  suggestedMetadata?: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
  };
} {
  const kw = opportunity.keyword;
  const pName = product?.name || opportunity.productName || 'Musky Dose Botanical Product';
  const pDesc = product?.shortDescription || '100% pure organic herbal product sourced directly from Sojat, Rajasthan.';

  switch (opportunity.suggestedAction) {
    case 'CREATE_FAQ_DRAFT': {
      const md = `### Frequently Asked Question: ${kw}

**Q: ${kw.charAt(0).toUpperCase() + kw.slice(1)}?**
**A:** Musky Dose ${pName} is cultivated and packaged directly in Sojat, Rajasthan. Our ultra-fine sifted, 100% chemical-free formula ensures maximum natural potency without PPD, ammonia, or synthetic additives. Apply as directed for optimal, long-lasting natural results.

*Key Botanical Benefits:*
- Pure GI-origin Sojat cultivation
- 100% chemical and additive free
- Tested and packed with maximum harvest freshness`;

      return {
        type: 'CREATE_FAQ_DRAFT',
        title: `Botanical FAQ Draft for "${kw}"`,
        markdownContent: md,
        copyableText: md,
      };
    }

    case 'CREATE_GUIDE_DRAFT': {
      const md = `# The Complete Guide: ${kw.toUpperCase()}

## Introduction
Discover the traditional benefits and authentic purity of ${pName} sourced directly from the arid soils of Sojat, Rajasthan.

## Why Authentic Sojat Purity Matters
- **High Lawsonia Content:** Naturally deep, rich pigment without synthetic dyes.
- **Traditional Processing:** Micro-sifted and shade-dried to retain active botanical goodness.
- **Zero Chemical Adulteration:** Safe for regular scalp, hair, and body application.

## Recommended Application Regimen
1. Mix with lukewarm water or pure Damask Rose Water Spray into a smooth paste.
2. Allow to rest for 30–45 minutes for natural dye release.
3. Apply evenly and leave for 2–3 hours. Rinse with plain water.`;

      return {
        type: 'CREATE_GUIDE_DRAFT',
        title: `Botanical Guide Draft for "${kw}"`,
        markdownContent: md,
        copyableText: md,
      };
    }

    case 'PREPARE_ADS_DRAFT': {
      const text = `=== GOOGLE SEARCH ADS DRAFT ===
Headline 1: Pure Sojat Henna & Botanicals
Headline 2: 100% Organic | Direct From Sojat
Headline 3: Fast All-India Delivery
Description 1: Direct from Sojat, Rajasthan. Ultra-fine sifted chemical-free purity with rich natural color.
Description 2: Guaranteed fresh harvest botanicals. WhatsApp ordering & COD available nationwide.
Target Keyword: [${kw}] (Exact Match) / "${kw}" (Phrase Match)
Final URL: https://muskydose.in/products/${product?.slug || ''}`;

      return {
        type: 'PREPARE_ADS_DRAFT',
        title: `Google Ads Copy Draft for "${kw}"`,
        markdownContent: `\`\`\`text\n${text}\n\`\`\``,
        copyableText: text,
      };
    }

    case 'OPTIMIZE_PRODUCT':
    default: {
      const proposedTitle = `${pName} | Pure Sojat — Musky Dose`;
      const proposedDesc = `${pDesc.slice(0, 120)} 100% pure organic Sojat botanical with fast nationwide delivery.`;
      const proposedKeywords = [kw, pName, 'Sojat Rajasthan', 'Musky Dose', 'Pure Botanical'];

      const md = `### Proposed Product SEO Metadata for "${pName}"

- **Proposed SEO Title (${proposedTitle.length} chars):**
  \`${proposedTitle}\`

- **Proposed Meta Description (${proposedDesc.length} chars):**
  \`${proposedDesc}\`

- **Target Keyword Tags:**
  \`${proposedKeywords.join(', ')}\``;

      return {
        type: 'OPTIMIZE_PRODUCT',
        title: `SEO Metadata Optimization for "${pName}"`,
        markdownContent: md,
        copyableText: `SEO Title: ${proposedTitle}\nMeta Description: ${proposedDesc}\nKeywords: ${proposedKeywords.join(', ')}`,
        suggestedMetadata: {
          seoTitle: proposedTitle,
          seoDescription: proposedDesc,
          seoKeywords: proposedKeywords,
        },
      };
    }
  }
}

// ============================================================
// 8. HIGH-PERFORMANCE PAGINATED DASHBOARD LOADER & ATTRIBUTION
// ============================================================

import { getRawAnalyticsEvents } from '@/lib/db/analytics-db';
import { GuideAttributionMetric } from './types';

export async function getGuideAttributionSummary(
  days = 30,
  guides: any[] = []
): Promise<GuideAttributionMetric[]> {
  const events = await getRawAnalyticsEvents(days);
  const orders = await getOrdersForAnalytics(days);

  const guideMap = new Map<string, {
    views: number;
    clicks: number;
    atc: number;
    orders: number;
    revenue: number;
    title: string;
    category: string;
  }>();

  // Initialize with all guides
  for (const g of guides) {
    guideMap.set(g.slug, {
      views: 0,
      clicks: 0,
      atc: 0,
      orders: 0,
      revenue: 0,
      title: g.title,
      category: g.categoryName || 'Guides',
    });
  }

  // Count events
  for (const ev of events) {
    const slug = (ev.metadata as any)?.guideSlug || (ev.pathname?.startsWith('/guides/') ? ev.pathname.replace('/guides/', '') : null);
    if (slug) {
      const entry = guideMap.get(slug) || {
        views: 0,
        clicks: 0,
        atc: 0,
        orders: 0,
        revenue: 0,
        title: (ev.metadata as any)?.guideTitle || slug,
        category: 'Guides',
      };

      if (ev.eventName === 'guide_view' || ev.eventName === 'page_view') {
        entry.views++;
      } else if (ev.eventName === 'guide_product_click') {
        entry.clicks++;
      } else if (ev.eventName === 'add_to_cart') {
        entry.atc++;
      }
      guideMap.set(slug, entry);
    }
  }

  // Correlate with orders
  for (const order of orders) {
    const rawUtm = (order as any).utmSource || (order as any).source || '';
    if (typeof rawUtm === 'string' && rawUtm.startsWith('guide_')) {
      const slug = rawUtm.replace('guide_', '');
      const entry = guideMap.get(slug);
      if (entry) {
        entry.orders++;
        entry.revenue += Number((order as any).totalAmount || (order as any).total || 0);
      }
    }
  }

  const results: GuideAttributionMetric[] = [];
  for (const [slug, data] of guideMap.entries()) {
    const ctr = data.views > 0 ? Number(((data.clicks / data.views) * 100).toFixed(1)) : 0;
    const conversionRate = data.clicks > 0 ? Number(((data.orders / data.clicks) * 100).toFixed(1)) : 0;
    results.push({
      guideSlug: slug,
      guideTitle: data.title,
      category: data.category,
      guideViews: data.views,
      productClicks: data.clicks,
      addToCartCount: data.atc,
      ordersCount: data.orders,
      attributedRevenue: data.revenue,
      ctr,
      conversionRate,
    });
  }

  return results.sort((a, b) => b.productClicks - a.productClicks || b.guideViews - a.guideViews);
}

export async function getGrowthOpportunitiesDashboard(
  products: Product[],
  verifiedKeywords: GrowthKeyword[] = [],
  gscQueries: SearchConsoleQuery[] = [],
  orders: any[] = [],
  guides: any[] = [],
  params: {
    page?: number;
    limit?: number;
    type?: string;
    priority?: string;
    productId?: string;
    search?: string;
  } = {}
): Promise<{
  opportunities: GrowthOpportunity[];
  stats: OpportunityDashboardStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const allOpps = generateGrowthOpportunities(products, verifiedKeywords, gscQueries, orders, guides);

  // Compute overall stats
  let p1Count = 0;
  let p2Count = 0;
  let p3Count = 0;
  let highDemandUntargetedCount = 0;
  let gscRankingStrikeCount = 0;
  let regionalExpansionCount = 0;
  let questionGapsCount = 0;
  let adsDraftsCount = 0;
  let productsNeedingSeoCount = 0;

  for (const opp of allOpps) {
    if (opp.priority === 'P1_NOW') p1Count++;
    else if (opp.priority === 'P2_NEXT') p2Count++;
    else p3Count++;

    if (opp.type === 'HIGH_DEMAND_UNTARGETED') highDemandUntargetedCount++;
    if (opp.type === 'GSC_RANKING_STRIKE') gscRankingStrikeCount++;
    if (opp.type === 'REGIONAL_MARKET_EXPANSION') regionalExpansionCount++;
    if (opp.type === 'QUESTION_CONTENT_GAP') questionGapsCount++;
    if (opp.type === 'ADS_TARGETING_READY') adsDraftsCount++;
  }

  // Calculate average SEO health score across products
  let totalHealth = 0;
  for (const p of products) {
    const health = calculateProductSeoHealth(p, undefined, verifiedKeywords);
    totalHealth += health.overallScore;
    if (health.rating === 'NEEDS_WORK') {
      productsNeedingSeoCount++;
    }
  }
  const avgHealth = products.length > 0 ? Math.round(totalHealth / products.length) : 0;

  const stats: OpportunityDashboardStats = {
    totalOpportunities: allOpps.length,
    p1Count,
    p2Count,
    p3Count,
    productsNeedingSeoCount,
    highDemandUntargetedCount,
    gscRankingStrikeCount,
    regionalExpansionCount,
    questionGapsCount,
    adsDraftsCount,
    averageSeoHealthScore: avgHealth,
  };

  // Apply filters
  let filtered = allOpps;

  if (params.priority) {
    filtered = filtered.filter((o) => o.priority === params.priority);
  }

  if (params.type) {
    filtered = filtered.filter((o) => o.type === params.type);
  }

  if (params.productId) {
    filtered = filtered.filter((o) => o.productId === params.productId);
  }

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.keyword.toLowerCase().includes(q) ||
        (o.productName && o.productName.toLowerCase().includes(q))
    );
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    opportunities: paginated,
    stats,
    total,
    page,
    limit,
    totalPages,
  };
}
