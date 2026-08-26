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
// 5. AUTOMATIC GROWTH OPPORTUNITIES GENERATOR
// ============================================================

export function generateGrowthOpportunities(
  products: Product[],
  verifiedKeywords: GrowthKeyword[] = [],
  gscQueries: SearchConsoleQuery[] = [],
  orders: any[] = []
): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];
  const seenKeys = new Set<string>();

  // Helper to calculate order metrics per botanical keyword
  const orderCountMap = new Map<string, { count: number; revenue: number }>();
  for (const order of orders) {
    const items = order.items || [];
    for (const item of items) {
      const title = (item.productName || item.title || '').toLowerCase();
      const existing = orderCountMap.get(title) || { count: 0, revenue: 0 };
      existing.count += item.quantity || 1;
      existing.revenue += (item.unitPrice || item.price || 0) * (item.quantity || 1);
      orderCountMap.set(title, existing);
    }
  }

  // ------------------------------------------------------------
  // A. HIGH-DEMAND VERIFIED KEYWORDS (Google Keyword Planner CSV)
  // ------------------------------------------------------------
  for (const kw of verifiedKeywords) {
    const qLower = kw.keyword.toLowerCase().trim();
    if (!qLower || seenKeys.has(`csv_${qLower}_${kw.state || 'nat'}`)) continue;

    // Check if any product specifically targets this in SEO Title or Slug
    const matchingProduct = products.find(
      (p) =>
        p.isActive !== false &&
        (p.name.toLowerCase().includes(qLower) ||
          (p.seoTitle && p.seoTitle.toLowerCase().includes(qLower)) ||
          p.slug.toLowerCase().includes(qLower.replace(/\s+/g, '-')))
    );

    const isHighVolume = kw.searchVolume && kw.searchVolume >= 5000;
    const isMediumVolume = kw.searchVolume && kw.searchVolume >= 1000;

    let priority: GrowthOpportunityPriority = 'P3_LATER';
    if (isHighVolume && (!matchingProduct || !matchingProduct.seoTitle)) {
      priority = 'P1_NOW';
    } else if (isMediumVolume || kw.state) {
      priority = 'P2_NEXT';
    }

    let type: GrowthOpportunityType = 'HIGH_DEMAND_UNTARGETED';
    let suggestedAction: GrowthOpportunityAction = 'OPTIMIZE_PRODUCT';
    let actionLabel = 'Optimize Product Page';

    if (kw.state && kw.state !== 'National') {
      type = 'REGIONAL_MARKET_EXPANSION';
      actionLabel = `Target ${kw.state} Market`;
    } else if (qLower.includes('how') || qLower.includes('benefit') || qLower.includes('side effect')) {
      type = 'QUESTION_CONTENT_GAP';
      suggestedAction = 'CREATE_FAQ_DRAFT';
      actionLabel = 'Create Botanical FAQ Draft';
    } else if (kw.searchVolume && kw.searchVolume >= 25000) {
      type = 'ADS_TARGETING_READY';
      suggestedAction = 'PREPARE_ADS_DRAFT';
      actionLabel = 'Prepare Google Ads Draft';
    }

    seenKeys.add(`csv_${qLower}_${kw.state || 'nat'}`);
    opportunities.push({
      id: `opp_csv_${kw.id || Math.random().toString(36).substring(2, 9)}`,
      title: `${kw.keyword.toUpperCase()} (${kw.searchVolume ? `${kw.searchVolume.toLocaleString()}/mo` : 'Demand Record'})`,
      description: `Verified ${kw.sourceName || 'GKP'} demand in ${kw.state || 'National India'}. ${matchingProduct ? `Mapped to "${matchingProduct.name}".` : 'No dedicated product metadata optimization found.'}`,
      type,
      priority,
      keyword: kw.keyword,
      productId: matchingProduct?.id,
      productName: matchingProduct?.name,
      productSlug: matchingProduct?.slug,
      marketDemand: {
        searchVolume: kw.searchVolume ?? null,
        cpc: kw.cpc ?? null,
        competition: kw.competition ?? null,
        sourceName: kw.sourceName,
        collectedAt: kw.collectedAt,
      },
      location: kw.state ? { state: kw.state, city: kw.city } : undefined,
      suggestedAction,
      actionLabel,
      actionLink: matchingProduct ? `/admin/products/${matchingProduct.id}` : undefined,
      relevanceScore: matchingProduct ? 92 : 75,
      freshnessStatus: 'Fresh',
      createdAt: kw.collectedAt || new Date().toISOString(),
    });
  }

  // ------------------------------------------------------------
  // B. GOOGLE SEARCH CONSOLE STRIKING DISTANCE OPPORTUNITIES (Pos 4-20)
  // ------------------------------------------------------------
  for (const gsc of gscQueries) {
    const qLower = gsc.query.toLowerCase().trim();
    if (!qLower || seenKeys.has(`gsc_${qLower}`)) continue;

    const pos = gsc.position;
    const isStrikingDistance = pos >= 4.0 && pos <= 20.0;
    const hasHighImpressionsLowClicks = gsc.impressions >= 10 && gsc.ctr < 0.05;

    if (isStrikingDistance || hasHighImpressionsLowClicks) {
      const matchingProduct = products.find(
        (p) => p.name.toLowerCase().includes(qLower) || p.slug.includes(qLower.replace(/\s+/g, '-'))
      );

      const priority: GrowthOpportunityPriority = pos <= 10.0 ? 'P1_NOW' : 'P2_NEXT';

      seenKeys.add(`gsc_${qLower}`);
      opportunities.push({
        id: `opp_gsc_${Math.random().toString(36).substring(2, 9)}`,
        title: `Rank #${pos.toFixed(1)}: "${gsc.query}" (${gsc.impressions} Impressions)`,
        description: `Google Search Console striking-distance query. Currently average position ${pos.toFixed(1)} with ${gsc.clicks} clicks (${(gsc.ctr * 100).toFixed(1)}% CTR). Optimizing title & snippet can capture front-page clicks.`,
        type: 'GSC_RANKING_STRIKE',
        priority,
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
        actionLabel: 'Enhance Title & Meta Snippet',
        actionLink: matchingProduct ? `/admin/products/${matchingProduct.id}` : undefined,
        relevanceScore: 90,
        freshnessStatus: 'Fresh',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ------------------------------------------------------------
  // C. PRODUCT METADATA & CONTENT HEALTH GAPS
  // ------------------------------------------------------------
  for (const p of products) {
    if (p.isActive === false) continue;
    const health = calculateProductSeoHealth(p, undefined, verifiedKeywords);

    if (health.rating === 'NEEDS_WORK' || !p.seoTitle || !p.seoDescription) {
      opportunities.push({
        id: `opp_meta_${p.id}`,
        title: `SEO Incomplete: ${p.name}`,
        description: `Product SEO Health is ${health.overallScore}% (${health.rating}). Missing ${health.breakdown.completenessMissingFields.slice(0, 2).join(', ')}.`,
        type: 'METADATA_INCOMPLETE',
        priority: 'P1_NOW',
        keyword: p.name,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        suggestedAction: 'OPTIMIZE_PRODUCT',
        actionLabel: 'Complete SEO Metadata',
        actionLink: `/admin/products/${p.id}`,
        relevanceScore: 95,
        freshnessStatus: 'Fresh',
        createdAt: p.updatedAt || new Date().toISOString(),
      });
    }

    // Add Question Gap Opportunity if product has rich questions in universe
    const uv = generateProductKeywordUniverse(p, verifiedKeywords);
    if (uv.suggestedQuestions.length > 0 && !seenKeys.has(`q_${p.id}`)) {
      const topQ = uv.suggestedQuestions[0];
      seenKeys.add(`q_${p.id}`);
      opportunities.push({
        id: `opp_q_${p.id}`,
        title: `FAQ Opportunity: "${topQ}"`,
        description: `High-intent botanical query for "${p.name}". Creating an FAQ or Guide section will capture organic informational search traffic.`,
        type: 'QUESTION_CONTENT_GAP',
        priority: 'P2_NEXT',
        keyword: topQ,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        suggestedAction: 'CREATE_FAQ_DRAFT',
        actionLabel: 'Draft Botanical FAQ',
        actionLink: `/admin/products/${p.id}`,
        relevanceScore: 85,
        freshnessStatus: 'Fresh',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Sort: P1_NOW first, then P2_NEXT, then P3_LATER, secondary by relevance
  const priorityWeight: Record<GrowthOpportunityPriority, number> = {
    P1_NOW: 300,
    P2_NEXT: 200,
    P3_LATER: 100,
  };

  return opportunities.sort((a, b) => {
    const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (pDiff !== 0) return pDiff;
    return b.relevanceScore - a.relevanceScore;
  });
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
**A:** Musky Dose ${pName} is cultivated and packaged directly in Sojat, Rajasthan. Our triple-shifted, 100% chemical-free formula ensures maximum natural potency without PPD, ammonia, or synthetic additives. Apply as directed for optimal, long-lasting natural results.

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
Description 1: Direct from Sojat, Rajasthan. Triple-shifted chemical-free purity with rich natural color.
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
// 7. HIGH-PERFORMANCE PAGINATED DASHBOARD LOADER
// ============================================================

export async function getGrowthOpportunitiesDashboard(
  products: Product[],
  verifiedKeywords: GrowthKeyword[] = [],
  gscQueries: SearchConsoleQuery[] = [],
  orders: any[] = [],
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
  const allOpps = generateGrowthOpportunities(products, verifiedKeywords, gscQueries, orders);

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
