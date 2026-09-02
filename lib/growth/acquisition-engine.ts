/**
 * MUSKY DOSE — LEAD ACQUISITION ENGINE V1
 * Product Acquisition Readiness, Local & Commercial Search Intent Mapping,
 * Merchant Feed Diagnostics, Lead Potential Scoring & Opportunity Detection.
 * 
 * Safety Guarantee:
 * - Deterministic non-inflated readiness scores (0–100 capped)
 * - Strict Henna/Mehndi botanical taxonomy compliance
 * - No doorway pages or phantom rankings
 */

import { Product } from '@/lib/types';
import {
  ProductAcquisitionReadiness,
  AcquisitionDashboardMetrics,
  GrowthOpportunity,
  LeadRecord,
} from './types';
import { validateProductForMerchantFeed } from './merchant-feed-engine';
import { deriveProductAutoSeo } from './product-keyword-engine';
import { calculateLeadSummaryMetrics } from './lead-engine';

export function deriveCommercialSearchQueries(product: Product): string[] {
  const name = product.name.trim();
  const queries: string[] = [
    name,
    `${name} price`,
    `${name} online`,
    `${name} wholesale`,
    `${name} bulk`,
    `${name} supplier`,
    `${name} manufacturer`,
  ];

  if (product.quantityOrWeight) {
    queries.push(`${name} ${product.quantityOrWeight}`);
  }
  if (name.toLowerCase().includes('henna') || name.toLowerCase().includes('mehndi')) {
    queries.push(`${name} for mehndi artist`);
    queries.push(`${name} for bridal salon`);
    queries.push(`${name} Sojat`);
  }

  return queries;
}

export function deriveLocalSearchQueries(product: Product): string[] {
  const name = product.name.trim();
  return [
    `${name} Sojat Rajasthan`,
    `Sojat ${name} manufacturer`,
    `Sojat ${name} direct supplier`,
    `${name} wholesale mandi rate Rajasthan`,
  ];
}

export function evaluateProductAcquisitionReadiness(
  product: Product,
  baseUrl: string = 'https://muskydose.in',
  hasGuide: boolean = false
): ProductAcquisitionReadiness {
  const missingItems: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  const autoSeo = deriveProductAutoSeo(product);
  const feedValidation = validateProductForMerchantFeed(product, baseUrl);

  // 1. Title Quality (15 pts)
  const title = (product.name || '').trim();
  if (title.length >= 10 && !title.toLowerCase().includes('untitled')) {
    score += 15;
    strengths.push('Descriptive product title (+15)');
  } else {
    missingItems.push('Descriptive product title (minimum 10 chars)');
  }

  // 2. Meta Description (15 pts)
  const metaDesc = (product.seoDescription || product.shortDescription || '').trim();
  if (metaDesc.length >= 50) {
    score += 15;
    strengths.push('Detailed meta description (+15)');
  } else {
    missingItems.push('SEO meta description (minimum 50 chars)');
  }

  // 3. Primary Keyword & Topics (15 pts)
  if (autoSeo.primaryKeyword && autoSeo.secondaryKeywords.length >= 2) {
    score += 15;
    strengths.push(`Target primary keyword: "${autoSeo.primaryKeyword}" (+15)`);
  } else {
    missingItems.push('Primary & secondary keyword targeting universe');
  }

  // 4. Product Images (15 pts)
  const validImages = (product.images || []).filter((img) => img && !img.includes('fallback.svg'));
  if (validImages.length >= 1) {
    score += 15;
    strengths.push(`${validImages.length} high-resolution botanical product image(s) (+15)`);
  } else {
    missingItems.push('High-resolution product image (real harvest texture)');
  }

  // 5. Merchant Center Feed Eligibility (15 pts)
  if (feedValidation.feedStatus === 'FEED_READY') {
    score += 15;
    strengths.push('Google Merchant Center Free Listings eligible (+15)');
  } else {
    missingItems.push(`Merchant feed repair needed: ${feedValidation.validationErrors.join(', ')}`);
  }

  // 6. Guide & Internal Linking (10 pts)
  if (hasGuide) {
    score += 10;
    strengths.push('Linked educational Auto-Guide (+10)');
  } else {
    missingItems.push('Dedicated informational guide for top-of-funnel search traffic');
  }

  // 7. Commercial CTA & Lead Capture Readiness (15 pts)
  const priceNum = Number(product.price);
  if (priceNum > 0 && product.stockStatus !== 'out_of_stock') {
    score += 15;
    strengths.push('Active pricing & in-stock commercial status (+15)');
  } else {
    missingItems.push('Valid price and in-stock inventory count');
  }

  const readinessScore = Math.min(100, score);

  // Calculate Lead Potential Score (0–100)
  let leadPotential = 30;
  if (product.name.toLowerCase().includes('henna') || product.name.toLowerCase().includes('mehndi')) {
    leadPotential += 35; // High organic demand for Sojat Henna
  }
  if (product.price && product.price >= 299) leadPotential += 15;
  if (readinessScore >= 80) leadPotential += 20;
  const leadPotentialScore = Math.min(100, leadPotential);

  const commercialIntentCoverage = deriveCommercialSearchQueries(product);
  const localIntentCoverage = deriveLocalSearchQueries(product);

  let recommendedCta = 'ORDER ON WHATSAPP';
  if (product.name.toLowerCase().includes('henna') || product.name.toLowerCase().includes('mehndi')) {
    recommendedCta = 'GET ARTIST PRICE';
  } else if (product.quantityOrWeight?.includes('kg')) {
    recommendedCta = 'GET BULK PRICE';
  }

  return {
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    readinessScore,
    leadPotentialScore,
    feedStatus: feedValidation.feedStatus,
    missingItems,
    strengths,
    commercialIntentCoverage,
    localIntentCoverage,
    recommendedCta,
    canonicalUrl: `${baseUrl}/products/${product.slug}`,
    isIndexable: product.robotsIndex !== false,
    hasGuide,
    hasMerchantFeedItem: feedValidation.feedStatus === 'FEED_READY',
  };
}

export function evaluateAcquisitionOpportunities(
  products: Product[],
  readinessList: ProductAcquisitionReadiness[],
  leads: LeadRecord[]
): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];
  const now = new Date().toISOString();

  for (const readiness of readinessList) {
    const product = products.find((p) => p.id === readiness.productId);
    if (!product || product.isActive === false) continue;

    // 1. PRODUCT_FEED_GAP
    if (readiness.feedStatus === 'FEED_NEEDS_REVIEW') {
      opportunities.push({
        id: `opp-feed-gap-${product.id}`,
        type: 'PRODUCT_FEED_GAP',
        title: `Merchant Center Free Listings Gap: "${product.name}"`,
        description: `Product is not eligible for Google Free Listings. Issues: ${readiness.missingItems.join('; ')}. Resolving feeds unlocks free Google Shopping visibility across India.`,
        priority: 'P1_NOW',
        categoryFilter: 'ACQUISITION',
        status: 'OPEN',
        growthScore: 88,
        score: 88,
        relevanceScore: 92,
        confidence: 'HIGH',
        keyword: `${product.name} online price`,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        source: 'MERCHANT CENTER FEED',
        actionLabel: 'Repair Product Feed Data',
        suggestedAction: 'OPTIMIZE_PRODUCT',
        freshnessStatus: 'Fresh',
        createdAt: now,
      });
    }

    // 2. SEARCH_COVERAGE_GAP
    if (readiness.readinessScore < 70) {
      opportunities.push({
        id: `opp-search-coverage-gap-${product.id}`,
        type: 'SEARCH_COVERAGE_GAP',
        title: `Commercial Search Coverage Gap for "${product.name}"`,
        description: `Product acquisition readiness is ${readiness.readinessScore}/100. Enriching meta title, descriptions, and pack sizes will capture commercial queries.`,
        priority: 'P2_NEXT',
        categoryFilter: 'ACQUISITION',
        status: 'OPEN',
        growthScore: 82,
        score: 82,
        relevanceScore: 85,
        confidence: 'HIGH',
        keyword: readiness.commercialIntentCoverage[1] || product.name,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        source: 'ACQUISITION ENGINE',
        actionLabel: 'Enrich Search Coverage',
        suggestedAction: 'OPTIMIZE_PRODUCT',
        freshnessStatus: 'Fresh',
        createdAt: now,
      });
    }

    // 3. LOCAL_INTENT_OPPORTUNITY (Sojat / Rajasthan harvest origin)
    if (product.name.toLowerCase().includes('sojat') || product.name.toLowerCase().includes('henna')) {
      opportunities.push({
        id: `opp-local-intent-${product.id}`,
        type: 'LOCAL_INTENT_OPPORTUNITY',
        title: `Sojat Direct Buyer Intent Bridge: "${product.name}"`,
        description: `Leverage authentic Sojat, Rajasthan geographical origin to capture high-ticket bulk supplier inquiries directly to WhatsApp.`,
        priority: 'P2_NEXT',
        categoryFilter: 'ACQUISITION',
        status: 'OPEN',
        growthScore: 85,
        score: 85,
        relevanceScore: 90,
        confidence: 'HIGH',
        keyword: `sojat ${product.name.toLowerCase()} direct manufacturer`,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        source: 'GEOGRAPHIC AUDIT',
        actionLabel: 'Activate Sojat Intent Map',
        suggestedAction: 'MAP_SEARCH_SYNONYM',
        freshnessStatus: 'Fresh',
        createdAt: now,
      });
    }
  }

  // 4. WHOLESALE_ACQUISITION_GAP
  const wholesaleLeads = leads.filter((l) => l.leadType === 'WHOLESALE' || l.source === 'WHOLESALE_ENQUIRY');
  if (wholesaleLeads.length === 0) {
    opportunities.push({
      id: 'opp-wholesale-acq-gap',
      type: 'WHOLESALE_ACQUISITION_GAP',
      title: 'B2B Wholesale & Salon Acquisition Bridge Activation',
      description: 'Strengthen Sojat bulk catalog presentation and tier discounts on /wholesale to accelerate commercial inbound leads.',
      priority: 'P1_NOW',
      categoryFilter: 'WHOLESALE',
      status: 'OPEN',
      growthScore: 89,
      score: 89,
      relevanceScore: 92,
      confidence: 'HIGH',
      keyword: 'wholesale henna powder sojat',
      source: 'WHOLESALE PIPELINE',
      actionLabel: 'Optimize Wholesale Acquisition',
      suggestedAction: 'PRIORITIZE_WHOLESALE_LEAD',
      freshnessStatus: 'Fresh',
      createdAt: now,
    });
  }

  return opportunities;
}

export function getAcquisitionDashboardMetrics(
  products: Product[],
  readinessList: ProductAcquisitionReadiness[],
  leads: LeadRecord[]
): AcquisitionDashboardMetrics {
  const leadSummary = calculateLeadSummaryMetrics(leads);
  const activeProducts = products.filter((p) => p.isActive !== false);

  const feedReadyCount = readinessList.filter((r) => r.feedStatus === 'FEED_READY').length;
  const needsReviewCount = readinessList.filter((r) => r.feedStatus === 'FEED_NEEDS_REVIEW').length;

  const organicLeads = leads.filter(
    (l) => l.attribution?.searchAttributionType === 'EXACT_INTERNAL_SEARCH' || l.attribution?.searchAttributionType === 'GSC_SIGNAL'
  ).length;

  const gscConfigured = Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL && process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
  );

  return {
    totalLeads: leadSummary.totalLeads,
    leadsToday: leadSummary.leadsToday,
    qualifiedLeads: leadSummary.qualifiedLeads,
    highIntentLeads: leadSummary.highIntentLeads,
    leadRate: activeProducts.length > 0 ? Number(((leadSummary.totalLeads / (activeProducts.length * 10)) * 100).toFixed(1)) : 0,
    organicLeads,
    whatsappLeads: leadSummary.whatsappLeads,
    wholesaleLeads: leadSummary.wholesaleLeads,
    topProductByLeads: leadSummary.topProductByLeads,
    topLandingPageByLeads: leads[0]?.landingPage || '/products/sojat-pure-triple-shifted-henna-powder',
    feedReadyCount,
    needsReviewCount,
    acquisitionOpportunitiesCount: readinessList.filter((r) => r.readinessScore < 75 || r.feedStatus === 'FEED_NEEDS_REVIEW').length,
    gscStatus: gscConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    lastGscSync: new Date().toISOString(),
  };
}

