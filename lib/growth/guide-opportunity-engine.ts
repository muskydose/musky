/**
 * MUSKY DOSE — UNIVERSAL GUIDE OPPORTUNITY & TEMPLATE ENGINE V2
 * 
 * Reusable Guide Family Selection, Intent Collision Guard, and Dynamic Multi-Template Generation
 * 
 * Safety & Governance:
 * 1. Zero medical, disease, or guaranteed result claims.
 * 2. HENNA_MEHNDI intent consolidation (prevent duplicate spelling guides).
 * 3. Dynamic family selection (suppresses irrelevant guide types).
 * 4. Manual edit protection and truth-grounded drafts.
 */

import { Product, ProductGuide, ProductGuideFAQ } from '@/lib/types';
import { UniversalProductIntelligence } from './product-intelligence';
import { ProductKeywordUniverseV2 } from './keyword-universe-engine';
import {
  ProductScope,
  VerifiedAttribute,
  IntelligenceStatus,
} from './universal-product-contract';
import { getPromotableAttributes } from './intelligence-seo-composer';

export type GuideFamily =
  | 'PRODUCT_OVERVIEW'
  | 'WHAT_IS_IT'
  | 'HOW_TO_USE'
  | 'HOW_TO_STORE'
  | 'BUYING_GUIDE'
  | 'PACK_SIZE_GUIDE'
  | 'WHOLESALE_GUIDE'
  | 'B2B_GUIDE'
  | 'USE_CASE_GUIDE'
  | 'FAQ_GUIDE'
  | 'COMPARISON_GUIDE'
  | 'INGREDIENT_GUIDE'
  | 'ORIGIN_GUIDE'
  | 'CARE_MAINTENANCE';

export interface GuideOpportunity {
  family: GuideFamily;
  title: string;
  suggestedSlug: string;
  priority: 'P1_ESSENTIAL' | 'P2_RECOMMENDED' | 'P3_OPTIONAL';
  intent: 'RETAIL' | 'B2B' | 'LOCAL' | 'INFORMATIONAL';
  targetAudience: string;
  relevanceScore: number;
  reason: string;
}

export interface UniversalGuideDraft {
  family: GuideFamily;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  shortIntro: string;
  overview: string;
  whatIsThis: string;
  keyBenefits: string[];
  ingredients: string[];
  whoShouldUse: string;
  whoShouldAvoid: string;
  howToUse: string;
  quantityPreparation: string;
  storageInstructions: string;
  importantNotes: string;
  content: string;
  faqs: ProductGuideFAQ[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  associatedProductId: string;
  relatedProductIds: string[];
  coverImage: string;
  canonicalUrl: string;
  contextualLinks: { label: string; url: string; context: string }[];
  needsReview: boolean;
  reviewReasons: string[];
}

// ------------------------------------------------------------
// 1. DYNAMIC GUIDE FAMILY OPPORTUNITY SELECTION
// ------------------------------------------------------------
export function evaluateGuideOpportunities(
  intelligence: UniversalProductIntelligence,
  existingGuides: ProductGuide[] = []
): GuideOpportunity[] {
  const opps: GuideOpportunity[] = [];
  const name = intelligence.canonicalProductName;
  const baseEntity = intelligence.botanicalEntity.split('/')[0].trim();
  const slugBase = intelligence.normalizedProductName.replace(/\s+/g, '-');

  const getExistingGuide = (s: string) =>
    existingGuides.find((g) => g.slug === s || g.slug === `${s}-guide`);
  const hasGuideWithSlug = (s: string) => Boolean(getExistingGuide(s));
  const isProtectedGuide = (s: string) => {
    const g = getExistingGuide(s);
    return Boolean(
      g && ((g.status as string) === 'LOCKED' || g.source === 'MANUAL' || (g as any).governanceStatus === 'MANUAL' || (g as any).governanceStatus === 'LOCKED')
    );
  };

  // Scope flags
  const scopes = intelligence.productScopes || [];
  const hasHairScope = scopes.length === 0 || scopes.includes('HAIR');
  const hasBodyArtScope = scopes.length === 0 || scopes.includes('BODY_ART');
  const hasSkinScope = scopes.length === 0 || scopes.includes('SKIN');
  const hasAromatherapyScope = scopes.length === 0 || scopes.includes('AROMATHERAPY');

  // Promotable verified attributes
  const promotableAttrs = getPromotableAttributes(intelligence.verifiedAttributes || []);

  // 1. PRODUCT_OVERVIEW (Always Essential for every product)
  const overviewSlug = `${slugBase}-complete-guide`;
  opps.push({
    family: 'PRODUCT_OVERVIEW',
    title: `Complete Guide to ${name}: Overview, Uses & Purity Standards`,
    suggestedSlug: overviewSlug,
    priority: isProtectedGuide(overviewSlug) ? 'P3_OPTIONAL' : (hasGuideWithSlug(overviewSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL'),
    intent: 'INFORMATIONAL',
    targetAudience: 'General Customers & Natural Botanical Enthusiasts',
    relevanceScore: 100,
    reason: isProtectedGuide(overviewSlug)
      ? 'Existing manual / locked guide is protected from automated rewrite.'
      : `Primary authoritative pillar guide for ${name}.`,
  });

  // 2. HOW_TO_USE (Scope-isolated usage guide)
  const howToSlug = `how-to-use-${slugBase}`;
  let howToTitle = `How to Use ${name} for Best Results: Step-by-Step Instructions`;
  let howToAudience = 'Users seeking practical, safe application steps';
  let howToReason = 'High informational search demand for practical usage and paste preparation.';

  if (scopes.length > 0) {
    if (hasHairScope && !hasBodyArtScope) {
      howToTitle = `How to Use ${name} for Hair Care: Mixing, Application & Rinsing Guide`;
      howToAudience = 'Users seeking natural hair conditioning and herbal care';
      howToReason = 'Targeted step-by-step hair pack preparation and application steps.';
    } else if (hasBodyArtScope && !hasHairScope) {
      howToTitle = `How to Apply ${name} for Body Art: Step-by-Step Mehndi Application Guide`;
      howToAudience = 'Mehndi artists and bridal body art enthusiasts';
      howToReason = 'Practical step-by-step skin application instructions for body art.';
    } else if (hasSkinScope && !hasHairScope && !hasBodyArtScope) {
      howToTitle = `How to Use ${name} for Skin Care: Toning & Facial Application Guide`;
      howToAudience = 'Skincare enthusiasts seeking natural botanical facial care';
      howToReason = 'Practical botanical skincare and toning application steps.';
    } else if (hasAromatherapyScope && !hasHairScope && !hasBodyArtScope) {
      howToTitle = `How to Use ${name}: Aromatherapy & Diffusion Guide`;
      howToAudience = 'Aromatherapy and essential oil wellness users';
      howToReason = 'Practical diffusion and topical dilution instructions.';
    }
  }

  opps.push({
    family: 'HOW_TO_USE',
    title: howToTitle,
    suggestedSlug: howToSlug,
    priority: isProtectedGuide(howToSlug) ? 'P3_OPTIONAL' : (hasGuideWithSlug(howToSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL'),
    intent: 'INFORMATIONAL',
    targetAudience: howToAudience,
    relevanceScore: 95,
    reason: isProtectedGuide(howToSlug)
      ? 'Existing manual / locked guide is protected from automated rewrite.'
      : howToReason,
  });

  // 3. WHAT_IS_IT (Botanical characteristics or Factual Overview for UNKNOWN)
  const whatIsSlug = `what-is-${slugBase}`;
  const isUnknownEntity = intelligence.entity === 'UNKNOWN' || intelligence.canonicalEntityId === 'UNKNOWN';
  const whatIsTitle = isUnknownEntity
    ? `What is ${name}? Product Overview & Factual Sourcing`
    : `What is ${baseEntity}? Botanical Profile, Origins & Traditional Use`;
  const whatIsReason = isUnknownEntity
    ? 'Factual educational overview without unsupported botanical claims.'
    : 'Educational content answering basic search queries.';

  opps.push({
    family: 'WHAT_IS_IT',
    title: whatIsTitle,
    suggestedSlug: whatIsSlug,
    priority: isProtectedGuide(whatIsSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED',
    intent: 'INFORMATIONAL',
    targetAudience: 'Informed consumers researching herbal formulations',
    relevanceScore: 85,
    reason: isProtectedGuide(whatIsSlug)
      ? 'Existing manual / locked guide is protected from automated rewrite.'
      : whatIsReason,
  });

  // 4. HOW_TO_STORE (Crucial for fresh botanical powders & fresh henna cones)
  const storeSlug = `how-to-store-${slugBase}`;
  opps.push({
    family: 'HOW_TO_STORE',
    title: `How to Store ${name}: Shelf Life, Oxidation & Freshness Tips`,
    suggestedSlug: storeSlug,
    priority: isProtectedGuide(storeSlug) ? 'P3_OPTIONAL' : (intelligence.form === 'paste_cone' ? 'P1_ESSENTIAL' : 'P2_RECOMMENDED'),
    intent: 'INFORMATIONAL',
    targetAudience: 'Customers preventing spoilage or dye breakdown',
    relevanceScore: intelligence.form === 'paste_cone' ? 95 : 75,
    reason: isProtectedGuide(storeSlug)
      ? 'Existing manual / locked guide is protected from automated rewrite.'
      : `Proper storage preserves volatile pigments and essential botanicals.`,
  });

  // 5. BUYING_GUIDE (Helping buyers choose between variants)
  const buyingSlug = `${slugBase}-buying-guide`;
  opps.push({
    family: 'BUYING_GUIDE',
    title: `${name} Buying Guide: How to Identify 100% Pure vs Adulterated Products`,
    suggestedSlug: buyingSlug,
    priority: isProtectedGuide(buyingSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED',
    intent: 'RETAIL',
    targetAudience: 'Commercial buyers and safety-conscious shoppers',
    relevanceScore: 88,
    reason: isProtectedGuide(buyingSlug)
      ? 'Existing manual / locked guide is protected from automated rewrite.'
      : `Captures high commercial intent shoppers comparing brands and purity.`,
  });

  // 6. ORIGIN_GUIDE (Only if genuine Sojat or Rajasthan terroir)
  if (intelligence.localIntent === 'SOJAT_ORIGIN') {
    const originSlug = `sojat-origin-authenticity-${slugBase}`;
    opps.push({
      family: 'ORIGIN_GUIDE',
      title: `Why Sojat Henna is Renowned Worldwide: Soil, Lawsone Content & Processing`,
      suggestedSlug: originSlug,
      priority: isProtectedGuide(originSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL',
      intent: 'LOCAL',
      targetAudience: 'Discerning buyers seeking authentic GI terroir origins',
      relevanceScore: 92,
      reason: isProtectedGuide(originSlug)
        ? 'Existing manual / locked guide is protected from automated rewrite.'
        : `Leverages verified Sojat geographical terroir authority.`,
    });
  }

  // 7. WHOLESALE_GUIDE (Only if wholesale eligible — strictly gated against pack-size alone)
  if (intelligence.wholesaleEligible) {
    const wholesaleSlug = `${slugBase}-wholesale-bulk-sourcing-guide`;
    opps.push({
      family: 'WHOLESALE_GUIDE',
      title: `${name} Wholesale & Bulk Sourcing Guide: MOQ, Mandi Rates & Dispatch`,
      suggestedSlug: wholesaleSlug,
      priority: isProtectedGuide(wholesaleSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL',
      intent: 'B2B',
      targetAudience: 'Salons, Mehndi Artists, Resellers & Global Importers',
      relevanceScore: 90,
      reason: isProtectedGuide(wholesaleSlug)
        ? 'Existing manual / locked guide is protected from automated rewrite.'
        : `Direct pipeline for high-value B2B inquiry acquisition.`,
    });
  }

  // 8. COMPARISON_GUIDE (Scope-aware comparison)
  if (intelligence.entity === 'HENNA_MEHNDI') {
    if (hasHairScope) {
      const compSlug = 'natural-henna-vs-chemical-hair-dye-comparison';
      opps.push({
        family: 'COMPARISON_GUIDE',
        title: `Natural Sojat Henna vs Chemical Dye: Purity, Damage & Longevity Compared`,
        suggestedSlug: compSlug,
        priority: isProtectedGuide(compSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED',
        intent: 'INFORMATIONAL',
        targetAudience: 'Shoppers transitioning from synthetic dyes to natural hair care',
        relevanceScore: 87,
        reason: isProtectedGuide(compSlug)
          ? 'Existing manual / locked guide is protected from automated rewrite.'
          : `Addresses primary consumer hesitation regarding grey coverage and hair damage.`,
      });
    } else if (hasBodyArtScope && !hasHairScope) {
      const compSlug = 'natural-henna-vs-chemical-mehndi-cone-comparison';
      opps.push({
        family: 'COMPARISON_GUIDE',
        title: `Natural Body Art Henna vs Chemical Cones: PPD Safety & Stain Longevity Compared`,
        suggestedSlug: compSlug,
        priority: isProtectedGuide(compSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED',
        intent: 'INFORMATIONAL',
        targetAudience: 'Bridal clients and mehndi artists seeking safe chemical-free stain',
        relevanceScore: 87,
        reason: isProtectedGuide(compSlug)
          ? 'Existing manual / locked guide is protected from automated rewrite.'
          : `Addresses consumer safety regarding black chemical henna cones vs pure body art henna.`,
      });
    }
  } else if (intelligence.entity === 'INDIGO' && hasHairScope) {
    const compSlug = 'henna-and-indigo-2-step-process-guide';
    opps.push({
      family: 'COMPARISON_GUIDE',
      title: `Henna & Indigo 2-Step Process: How to Achieve Rich Natural Black Tones`,
      suggestedSlug: compSlug,
      priority: isProtectedGuide(compSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL',
      intent: 'INFORMATIONAL',
      targetAudience: 'Natural hair coloring customers avoiding ammonia/PPD',
      relevanceScore: 96,
      reason: isProtectedGuide(compSlug)
        ? 'Existing manual / locked guide is protected from automated rewrite.'
        : `Indigo must almost always be used in tandem with Henna for black color.`,
    });
  }

  // 9. VERIFIED ATTRIBUTE GUIDES (Promotable attributes only)
  // BAQ Guide
  if (hasBodyArtScope && promotableAttrs.some((a) => a.slug === 'body-art-quality' || a.slug === 'baq')) {
    const baqSlug = `what-is-body-art-quality-baq-${slugBase}`;
    opps.push({
      family: 'INGREDIENT_GUIDE',
      title: `What is Body Art Quality (BAQ) Henna? Purity, Sifting & Lawsone Standards`,
      suggestedSlug: baqSlug,
      priority: isProtectedGuide(baqSlug) ? 'P3_OPTIONAL' : (hasGuideWithSlug(baqSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL'),
      intent: 'INFORMATIONAL',
      targetAudience: 'Professional mehndi artists and purity-conscious body art customers',
      relevanceScore: 94,
      reason: isProtectedGuide(baqSlug)
        ? 'Existing manual / locked guide is protected from automated rewrite.'
        : 'Verified Body Art Quality (BAQ) attribute unlocks specialized purity guide.',
    });
  }

  // Certified Organic Guide
  if (promotableAttrs.some((a) => a.slug === 'organic')) {
    const organicSlug = `certified-organic-purity-${slugBase}`;
    opps.push({
      family: 'INGREDIENT_GUIDE',
      title: `Certified Organic ${name}: Purity Standards & Cultivation Process`,
      suggestedSlug: organicSlug,
      priority: isProtectedGuide(organicSlug) ? 'P3_OPTIONAL' : (hasGuideWithSlug(organicSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED'),
      intent: 'INFORMATIONAL',
      targetAudience: 'Consumers seeking certified organic, pesticide-free botanicals',
      relevanceScore: 91,
      reason: isProtectedGuide(organicSlug)
        ? 'Existing manual / locked guide is protected from automated rewrite.'
        : 'Verified legal organic registration unlocks certified purity guide.',
    });
  }

  // Lab-Tested Safety Guide
  if (promotableAttrs.some((a) => a.slug === 'lab-tested')) {
    const labSlug = `lab-tested-safety-${slugBase}`;
    opps.push({
      family: 'INGREDIENT_GUIDE',
      title: `Lab-Tested Safety: How ${name} is Tested for Heavy Metals & Purity`,
      suggestedSlug: labSlug,
      priority: isProtectedGuide(labSlug) ? 'P3_OPTIONAL' : (hasGuideWithSlug(labSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED'),
      intent: 'INFORMATIONAL',
      targetAudience: 'Safety-conscious customers seeking verified laboratory testing',
      relevanceScore: 90,
      reason: isProtectedGuide(labSlug)
        ? 'Existing manual / locked guide is protected from automated rewrite.'
        : 'Verified laboratory certificate unlocks lab testing safety guide.',
    });
  }

  // 10. FAQ_GUIDE
  const faqSlug = `${slugBase}-frequently-asked-questions`;
  opps.push({
    family: 'FAQ_GUIDE',
    title: `${name}: 10 Most Common Questions Answered by Botanical Experts`,
    suggestedSlug: faqSlug,
    priority: isProtectedGuide(faqSlug) ? 'P3_OPTIONAL' : 'P2_RECOMMENDED',
    intent: 'INFORMATIONAL',
    targetAudience: 'First-time users troubleshooting preparation or application',
    relevanceScore: 80,
    reason: isProtectedGuide(faqSlug)
      ? 'Existing manual / locked guide is protected from automated rewrite.'
      : `Targeted FAQ schema capture for Google SERP feature snippets.`,
  });

  return opps;
}

// ------------------------------------------------------------
// 2. UNIVERSAL MULTI-TEMPLATE GUIDE DRAFT GENERATOR
// ------------------------------------------------------------
export function generateUniversalGuideDraft(params: {
  intelligence: UniversalProductIntelligence;
  family?: GuideFamily;
  keywordUniverse?: ProductKeywordUniverseV2;
  allProducts?: Product[];
  productId?: string;
  coverImage?: string;
  existingGuide?: ProductGuide;
}): UniversalGuideDraft {
  const {
    intelligence,
    family = 'PRODUCT_OVERVIEW',
    keywordUniverse,
    allProducts = [],
    productId = '',
    coverImage = '/images/fallback.svg',
    existingGuide,
  } = params;

  const name = intelligence.canonicalProductName;
  const baseEntity = intelligence.botanicalEntity.split('/')[0].trim();
  const form = intelligence.form.replace(/_/g, ' ');
  const slugBase = intelligence.normalizedProductName.replace(/\s+/g, '-');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
  const siteName = 'Musky Dose';

  // Manual / Locked Guide Protection:
  if (
    existingGuide &&
    (((existingGuide.status as string) === 'LOCKED') ||
      existingGuide.source === 'MANUAL' ||
      (existingGuide as any).governanceStatus === 'MANUAL' ||
      (existingGuide as any).governanceStatus === 'LOCKED')
  ) {
    return {
      family: (existingGuide.category as GuideFamily) || family,
      title: existingGuide.title,
      slug: existingGuide.slug,
      category: existingGuide.category || intelligence.categoryName,
      readTime: existingGuide.readTime || '5 min read',
      shortIntro: existingGuide.shortIntro,
      overview: existingGuide.overview || existingGuide.content || '',
      whatIsThis: existingGuide.whatIsThis || '',
      keyBenefits: existingGuide.keyBenefits || [],
      ingredients: existingGuide.ingredients || [],
      whoShouldUse: existingGuide.whoShouldUse || '',
      whoShouldAvoid: existingGuide.whoShouldAvoid || '',
      howToUse: existingGuide.howToUse || '',
      quantityPreparation: existingGuide.quantityPreparation || '',
      storageInstructions: existingGuide.storageInstructions || '',
      importantNotes: existingGuide.importantNotes || '',
      content: existingGuide.content || '',
      faqs: existingGuide.faqs || [],
      seoTitle: existingGuide.seoTitle || `${existingGuide.title.slice(0, 50)} | ${siteName}`,
      seoDescription: existingGuide.seoDescription || existingGuide.shortIntro.slice(0, 155),
      seoKeywords: existingGuide.seoKeywords || '',
      primaryKeyword: intelligence.canonicalProductName,
      secondaryKeywords: [],
      longTailKeywords: [],
      associatedProductId: existingGuide.productId || productId,
      relatedProductIds: existingGuide.relatedProductIds || [],
      coverImage: existingGuide.coverImage || coverImage,
      canonicalUrl: `${baseUrl}/guides/${existingGuide.slug}`,
      contextualLinks: [
        { label: `View ${name} in Store`, url: `/products/${slugBase}`, context: 'Direct product purchase page' },
      ],
      needsReview: false,
      reviewReasons: ['Preserved existing manual / locked guide content without overwrite.'],
    };
  }

  // Scopes & Entity Flags
  const scopes = intelligence.productScopes || [];
  const hasHairScope = scopes.length === 0 || scopes.includes('HAIR');
  const hasBodyArtScope = scopes.length === 0 || scopes.includes('BODY_ART');
  const isUnknownEntity = intelligence.entity === 'UNKNOWN' || intelligence.canonicalEntityId === 'UNKNOWN';

  // Promotable verified attributes
  const promotableAttrs = getPromotableAttributes(intelligence.verifiedAttributes || []);
  const hasVerifiedBaq = promotableAttrs.some((a) => a.slug === 'body-art-quality' || a.slug === 'baq');
  const hasVerifiedOrganic = promotableAttrs.some((a) => a.slug === 'organic');
  const hasVerifiedLabTested = promotableAttrs.some((a) => a.slug === 'lab-tested');

  // Contextual links graph
  const contextualLinks: UniversalGuideDraft['contextualLinks'] = [
    {
      label: `View ${name} in Store`,
      url: `/products/${slugBase}`,
      context: 'Direct product purchase page',
    },
  ];
  if (intelligence.localIntent === 'SOJAT_ORIGIN') {
    contextualLinks.push({
      label: 'Explore Sojat Henna Terroir & Heritage',
      url: '/sojat-henna',
      context: 'Authoritative origin documentation',
    });
  }
  if (intelligence.wholesaleEligible) {
    contextualLinks.push({
      label: 'Request Wholesale / Bulk Price Card',
      url: '/wholesale',
      context: 'B2B sourcing desk and direct WhatsApp consultation',
    });
  }
  contextualLinks.push({
    label: `Browse ${intelligence.categoryName}`,
    url: `/categories/${intelligence.categorySlug}`,
    context: 'Catalog category overview',
  });

  // Related products
  const relatedProductIds = allProducts
    .filter((p) => p.id !== productId && p.isActive !== false)
    .filter((p) => {
      const pName = p.name.toLowerCase();
      return (
        intelligence.relatedEntities.some((re) => pName.includes(re.toLowerCase())) ||
        p.categoryName?.toLowerCase() === intelligence.categoryName.toLowerCase()
      );
    })
    .slice(0, 4)
    .map((p) => p.id);

  // Derive template based on family
  let title = `Complete Guide to ${name}`;
  let slug = `${slugBase}-complete-guide`;
  let shortIntro = `A comprehensive botanical guide to ${name}, covering authentic sourcing, application, and care.`;
  let overview = `${baseEntity} (${name}) is a traditional botanical product sourced and prepared to verified purity standards for traditional personal care.`;
  let whatIsThis = `This product consists of 100% natural ${baseEntity} ${form}, formulated without synthetic adulterants, artificial fragrance, or harsh chemical additives.`;
  let howToUse = `Mix with warm water into a smooth paste. Apply evenly and follow recommended resting times.`;
  let quantityPreparation = `For localized or short application, prepare 50g-100g. For longer application, use 150g-250g.`;
  let storageInstructions = `Store in an airtight container in a cool, dry, and dark location away from direct sunlight and humidity.`;
  let importantNotes = `Perform a standard patch test 24 hours prior to full application. For external application only.`;
  let whoShouldUse = `Suitable for individuals seeking authentic, unadulterated botanical products for traditional personal care.`;
  let whoShouldAvoid = `Individuals with known plant sensitivities to ${baseEntity} should conduct a preliminary patch test.`;

  // UNKNOWN entity handling: safe non-clinical factual descriptions
  if (isUnknownEntity) {
    overview = `${name} is a botanical product supplied to verified quality standards for traditional personal care.`;
    whatIsThis = `This product consists of 100% pure ${name}, formulated without synthetic adulterants, artificial fragrance, or harsh chemical additives.`;
    howToUse = `Mix a small portion with warm water into a smooth paste. Conduct a 24-hour patch test before full use. Apply gently as directed for personal botanical care.`;
    quantityPreparation = `Prepare only the required quantity per application. Store remainder tightly sealed in a cool, dry place.`;
    whoShouldUse = `Suitable for individuals seeking authentic botanical ingredients for traditional personal care.`;
    whoShouldAvoid = `Conduct a standard 24-hour patch test before full use. Avoid if known plant sensitivities exist.`;
  } else if (intelligence.entity === 'HERBAL_BLEND') {
    overview = `${name} is an authentic multi-herb Ayurvedic preparation combining ${intelligence.blendComponents?.join(', ') || 'traditional botanicals'} for comprehensive hair and scalp care.`;
    whatIsThis = `This product is a 100% pure botanical blend containing zero synthetic detergents, sulfates, silicones, artificial colorants, or chemical preservatives.`;
    howToUse = `1. Take 2 to 3 tablespoons of herbal powder in a bowl.\n2. Mix with lukewarm water (or herbal tea) into a smooth, lump-free paste.\n3. Apply evenly to wet hair and massage gently into the scalp.\n4. Leave on for 15 to 30 minutes to allow natural saponins and botanical nutrients to cleanse and condition.\n5. Rinse thoroughly with plain water.`;
    quantityPreparation = `Short Hair: 30-50g | Medium Hair: 60-80g | Long Hair: 100-120g mixed with warm water.`;
  } else if (intelligence.form === 'paste_cone') {
    overview = `${name} contains smooth, micro-filtered natural henna paste prepared for intricate bridal and traditional body art application.`;
    whatIsThis = `Pre-rolled precision applicator cones filled with 100% natural Lawsonia Inermis paste, eucalyptus/clove terpene oil, and lemon-sugar blend. Free of chemical dye accelerators, PPD, and synthetic black stains.`;
    howToUse = `1. Ensure skin is clean and oil-free.\n2. Snip the cone tip to the desired aperture.\n3. Apply intricate designs onto palms or feet.\n4. Allow paste to dry for 20-30 minutes, then apply lemon-sugar sealant.\n5. Leave on skin for 4-8 hours for deep, natural mahogany oxidation.\n6. Scrape off dried paste gently; avoid water contact for the first 12 hours.`;
    quantityPreparation = `Cones are pre-mixed and ready to apply. Each cone yields approximately 1-2 full palm designs depending on complexity.`;
    storageInstructions = `Fresh natural henna cones contain zero artificial preservatives. Store in airtight freezer packaging for up to 6 months to preserve lawsone staining potency. Thaw at room temperature for 15 minutes before use.`;
  } else if (intelligence.productType === 'essential_oil' || intelligence.form === 'oil') {
    overview = `${name} is an aromatic botanical distillate obtained through traditional steam distillation for aromatherapy diffusion, personal care, and terpene mixing.`;
    whatIsThis = `100% pure, undiluted botanical essential oil containing zero artificial fragrance, mineral oil, parabens, or synthetic solvents.`;
    howToUse = `For aromatherapy: Add 3-5 drops to a room diffuser.\nFor henna paste: Add 5-10ml per 100g henna powder for natural terpene enrichment.\nFor topical use: Always dilute with a carrier oil (such as coconut or jojoba oil) at 1-2% ratio. Never apply undiluted directly to skin.`;
    quantityPreparation = `Use drop by drop. 1ml contains approximately 20-25 drops.`;
    storageInstructions = `Store in original amber glass bottle tightly capped in a cool, dark cabinet away from sunlight, heat, and open flames.`;
    importantNotes = `Concentrated botanical oil. For external application only. Keep away from eyes, children, and pets. Always conduct a 24-hour patch test before topical use.`;
  } else if (intelligence.productType === 'hydrosol_spray') {
    overview = `${name} is a pure floral hydrosol distillate captured during traditional hydro-distillation for facial toning, misting, and pack mixing.`;
    whatIsThis = `100% pure botanical floral distillate containing zero alcohol, artificial fragrance, parabens, or added water.`;
    howToUse = `Hold bottle 10-15cm away and spray gently over face and neck with eyes closed. Can be used as a morning refresher, post-cleansing toner, or mixing liquid for herbal face packs.`;
    storageInstructions = `Store in a cool, dry place away from direct sunlight. Can be stored in refrigerator for an enhanced cooling sensation.`;
  } else if (intelligence.entity === 'HENNA_MEHNDI') {
    if (hasHairScope && !hasBodyArtScope) {
      howToUse = `1. In a glass or ceramic bowl, blend pure henna powder with lukewarm water into a smooth paste resembling yogurt consistency.\n2. Cover with airtight wrap and allow 2-3 hours for natural lawsone dye release.\n3. Section hair, applying evenly from roots to tips.\n4. Leave on for 2-3 hours under a shower cap for rich conditioning and color development.\n5. Rinse thoroughly with plain water; avoid shampooing for the first 24 hours to allow natural oxidation.`;
      quantityPreparation = `Short Hair: 50-80g | Medium Hair: 100-150g | Long Hair: 200-250g mixed with warm water.`;
    } else if (hasBodyArtScope && !hasHairScope) {
      howToUse = `1. Sift pure henna powder finely to eliminate fibers for smooth cone flow.\n2. Mix with water, lemon juice, and essential terpene oils into an elastic paste.\n3. Allow 3-6 hours for natural lawsone dye release.\n4. Fill applicator cones and apply intricate designs onto clean skin.\n5. Leave paste on skin for 4-8 hours; avoid water for the first 12 hours for deep mahogany oxidation.`;
      quantityPreparation = `For bridal mehndi or intricate body art: 50g-100g powder yields 3-5 precision applicator cones.`;
    } else {
      howToUse = `For Hair Conditioning:\n1. Blend pure henna powder with lukewarm water into a smooth paste.\n2. Allow 2-3 hours for dye release, then apply evenly from roots to tips.\n3. Leave on for 2-3 hours and rinse thoroughly with plain water.\n\nFor Body Art:\n1. Sift finely and mix with water, essential oil, and lemon juice into an elastic paste.\n2. Allow 4-6 hours dye release, fill cones, and apply onto clean skin.\n3. Leave on skin for 4-8 hours for rich natural mahogany stain.`;
      quantityPreparation = `Hair Care: 50g-250g depending on hair length. Body Art: 30g-50g powder yields 2-3 applicator cones.`;
    }
  } else if (intelligence.entity === 'INDIGO') {
    howToUse = `1. Indigo powder should be mixed freshly just before application with warm water.\n2. Do NOT let indigo rest for hours; its dye activates within 15-20 minutes.\n3. Apply immediately to clean, henna-treated hair for deep black results.\n4. Leave on for 1-2 hours under a shower cap.\n5. Rinse gently with water.`;
    quantityPreparation = `Short Hair: 40-60g | Medium Hair: 80-100g | Long Hair: 120-150g mixed with warm water.`;
  }

  // Key Benefits (verified attribute promotion + zero medical claims)
  let keyBenefits: string[] = [];
  if (isUnknownEntity) {
    keyBenefits = ['Traditional botanical formulation', 'Zero artificial additives or chemical fillers'];
  } else if (intelligence.needsReview) {
    keyBenefits = ['100% natural botanical ingredient', '[GUIDE NEEDS REVIEW: Verify specific product benefits in Admin]'];
  } else {
    keyBenefits = intelligence.useCases.slice(0, 4);
    if (hasVerifiedBaq && hasBodyArtScope) {
      keyBenefits.push('Verified Body Art Quality (BAQ): Triple micro-sifted for smooth cone flow');
    }
    if (hasVerifiedOrganic) {
      keyBenefits.push('Certified Organic: Grown without synthetic chemical pesticides');
    }
    if (hasVerifiedLabTested) {
      keyBenefits.push('Lab-Tested Purity: Batch verified for safety and purity standards');
    }
  }

  let ingredients = isUnknownEntity
    ? [`100% Pure ${name}`]
    : intelligence.blendComponents && intelligence.blendComponents.length > 1
    ? intelligence.blendComponents.map((c) => `100% Pure ${c.replace(/_/g, ' ')} Powder`)
    : [intelligence.scientificName ? `100% Pure ${intelligence.scientificName}` : `100% Pure ${name}`];

  const faqs: ProductGuideFAQ[] = [
    {
      question: `Is ${name} 100% chemical-free?`,
      answer: `Yes. Musky Dose ${name} is 100% pure botanical, with zero synthetic colorants, ammonia, PPD, or chemical preservatives.`,
    },
    {
      question: `How should I store ${name} after opening?`,
      answer: `Keep the remaining powder or liquid sealed tightly in a cool, dark environment. Avoid exposing to ambient moisture or sunlight.`,
    },
    {
      question: `Can I combine ${name} with other natural botanicals?`,
      answer: `Yes. Traditional herbal powders like Amla, Shikakai, and Hibiscus blend harmoniously for customized hair and skin packs.`,
    },
  ];

  // Specific Family Adjustments
  if (family === 'HOW_TO_USE') {
    title = `How to Use ${name}: Step-by-Step Instructions & Mixing Guide`;
    slug = `how-to-use-${slugBase}`;
    shortIntro = `Master the correct mixing ratios, preparation steps, and application times for ${name}.`;
    if (intelligence.entity === 'HENNA_MEHNDI' && intelligence.form !== 'paste_cone') {
      if (hasHairScope && !hasBodyArtScope) {
        howToUse = `1. In a glass or ceramic bowl, blend pure henna powder with lukewarm water into a smooth paste resembling yogurt consistency.\n2. Cover with airtight wrap and allow 2-3 hours for natural lawsone dye release.\n3. Section hair, applying evenly from roots to tips.\n4. Leave on for 2-3 hours for rich conditioning and color development.\n5. Rinse thoroughly with plain water; avoid shampooing for the first 24 hours to allow natural oxidation.`;
        quantityPreparation = `Short Hair: 50-80g | Medium Hair: 100-150g | Long Hair: 200-250g mixed with warm water.`;
      } else if (hasBodyArtScope && !hasHairScope) {
        howToUse = `1. Sift pure henna powder finely to eliminate fibers for smooth cone flow.\n2. Mix with water, lemon juice, and essential terpene oils into an elastic paste.\n3. Allow 3-6 hours for natural lawsone dye release.\n4. Fill applicator cones and apply intricate designs onto clean skin.\n5. Leave paste on skin for 4-8 hours; avoid water for the first 12 hours for deep mahogany oxidation.`;
        quantityPreparation = `For bridal mehndi or intricate body art: 50g-100g powder yields 3-5 precision applicator cones.`;
      } else {
        howToUse = `For Hair Conditioning:\n1. Blend pure henna powder with lukewarm water into a smooth paste.\n2. Allow 2-3 hours for dye release, then apply evenly from roots to tips.\n3. Leave on for 2-3 hours and rinse thoroughly with plain water.\n\nFor Body Art:\n1. Sift finely and mix with water, essential oil, and lemon juice into an elastic paste.\n2. Allow 4-6 hours dye release, fill cones, and apply onto clean skin.\n3. Leave on skin for 4-8 hours for rich natural mahogany stain.`;
        quantityPreparation = `Hair Care: 50g-250g depending on hair length. Body Art: 30g-50g powder yields 2-3 applicator cones.`;
      }
    } else if (intelligence.entity === 'INDIGO') {
      howToUse = `1. Indigo powder should be mixed freshly just before application with warm water.\n2. Do NOT let indigo rest for hours; its dye activates within 15-20 minutes.\n3. Apply immediately to clean, henna-treated hair for deep black results.\n4. Leave on for 1-2 hours under a shower cap.\n5. Rinse gently with water.`;
      quantityPreparation = `Short Hair: 40-60g | Medium Hair: 80-100g | Long Hair: 120-150g mixed with warm water.`;
    }
  } else if (family === 'HOW_TO_STORE') {
    title = `How to Store ${name}: Shelf Life, Freshness & Oxidation Protection`;
    slug = `how-to-store-${slugBase}`;
    shortIntro = `Learn how to maintain peak botanical freshness and active properties of ${name}.`;
    storageInstructions = `1. Keep the powder sealed in its foil pouch or transfer to a dark airtight container.\n2. Store at room temperature away from stove heat or direct sunlight.\n3. Prevent water droplets or wet spoons from entering the pack.\n4. Frozen storage: Prepared fresh henna cones can be frozen for up to 6 months without dye degradation.`;
  } else if (family === 'WHOLESALE_GUIDE') {
    title = `${name} Wholesale & Bulk Sourcing: Specifications & Mandi Rates`;
    slug = `${slugBase}-wholesale-bulk-sourcing-guide`;
    shortIntro = `Direct factory bulk sourcing guide for salons, mehndi artists, and wholesale distributors.`;
    overview = `Musky Dose supplies fresh, micro-pulverized ${name} direct from processing units in Sojat, Rajasthan. Available in bulk batches (10kg, 25kg, 50kg bags) with verified batch consistency and direct logistics dispatch.`;
    faqs.push({
      question: `What is the Minimum Order Quantity (MOQ) for wholesale?`,
      answer: `Standard wholesale pricing activates at 5kg to 10kg, with tier discounts available up to commercial metric ton batches.`,
    });
    faqs.push({
      question: `Can I request a sample before placing a commercial order?`,
      answer: `Yes. Sample packs can be dispatched for professional quality assessment via our wholesale desk.`,
    });
  } else if (family === 'ORIGIN_GUIDE') {
    title = `Sojat Henna Terroir & Origin Authenticity: What Makes Sojat World-Famous`;
    slug = `sojat-origin-authenticity-${slugBase}`;
    shortIntro = `Discover why the arid climate and soil of Sojat, Rajasthan produce the world's highest lawsone content henna.`;
    overview = `Sojat City in Rajasthan is globally recognized as the Henna Capital. Arid weather conditions and mineral-dense soil stimulate Lawsonia Inermis plants to produce exceptionally high levels of lawsone pigment.`;
  }

  // Content compilation
  let content = `## Overview\n\n${overview}\n\n## What is This Product?\n\n${whatIsThis}\n\n## How to Use\n\n${howToUse}\n\n## Recommended Quantities\n\n${quantityPreparation}\n\n## Storage & Shelf Life\n\n${storageInstructions}\n\n## Important Safety Notes\n\n${importantNotes}`;

  const internalLinks: string[] = [];
  if (intelligence.localIntent === 'SOJAT_ORIGIN') {
    internalLinks.push(`- Explore authentic [Sojat Henna Origin & Processing](/sojat-henna).`);
  }
  if (intelligence.wholesaleEligible) {
    internalLinks.push(`- Sourcing for salons or bulk resale? Visit our [Wholesale Sourcing Desk](/wholesale).`);
  }
  if (productId) {
    internalLinks.push(`- View verified product details for [${name}](/products/${productId}).`);
  }
  if (internalLinks.length > 0) {
    content += `\n\n## Related Sourcing & Direct Links\n\n${internalLinks.join('\n')}`;
  }

  // SEO metadata
  const seoTitle = `${title.slice(0, 50)} | ${siteName}`;
  const seoDescription = shortIntro.slice(0, 155);

  const keywords = keywordUniverse
    ? keywordUniverse.allKeywords.slice(0, 10).map((k) => k.term)
    : [name, `${baseEntity} guide`, `how to use ${baseEntity}`, `pure ${baseEntity} powder`];

  const guideNeedsReview = intelligence.needsReview || isUnknownEntity;
  const guideReviewReasons = [...intelligence.reviewReasons];
  if (isUnknownEntity && !guideReviewReasons.some((r) => r.includes('UNKNOWN'))) {
    guideReviewReasons.push('Product entity is UNKNOWN. Botanical profile requires admin review.');
  }

  return {
    family,
    title,
    slug,
    category: intelligence.categoryName,
    readTime: '5 min read',
    shortIntro,
    overview,
    whatIsThis,
    keyBenefits,
    ingredients,
    whoShouldUse,
    whoShouldAvoid,
    howToUse,
    quantityPreparation,
    storageInstructions,
    importantNotes,
    content,
    faqs,
    seoTitle,
    seoDescription,
    seoKeywords: keywords.join(', '),
    primaryKeyword: keywords[0] || name,
    secondaryKeywords: keywords.slice(1, 5),
    longTailKeywords: keywords.slice(5, 10),
    associatedProductId: productId,
    relatedProductIds,
    coverImage,
    canonicalUrl: `${baseUrl}/guides/${slug}`,
    contextualLinks,
    needsReview: guideNeedsReview,
    reviewReasons: guideReviewReasons,
  };
}
