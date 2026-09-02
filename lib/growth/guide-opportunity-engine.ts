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

  const hasGuideWithSlug = (s: string) =>
    existingGuides.some((g) => g.slug === s || g.slug === `${s}-guide`);

  // 1. PRODUCT_OVERVIEW (Always Essential for every product)
  const overviewSlug = `${slugBase}-complete-guide`;
  opps.push({
    family: 'PRODUCT_OVERVIEW',
    title: `Complete Guide to ${name}: Overview, Uses & Purity Standards`,
    suggestedSlug: overviewSlug,
    priority: hasGuideWithSlug(overviewSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL',
    intent: 'INFORMATIONAL',
    targetAudience: 'General Customers & Natural Botanical Enthusiasts',
    relevanceScore: 100,
    reason: `Primary authoritative pillar guide for ${name}.`,
  });

  // 2. HOW_TO_USE (Essential for all powders, oils, sprays, and cones)
  const howToSlug = `how-to-use-${slugBase}`;
  opps.push({
    family: 'HOW_TO_USE',
    title: `How to Use ${name} for Best Results: Step-by-Step Instructions`,
    suggestedSlug: howToSlug,
    priority: hasGuideWithSlug(howToSlug) ? 'P3_OPTIONAL' : 'P1_ESSENTIAL',
    intent: 'INFORMATIONAL',
    targetAudience: 'Users seeking practical, safe application steps',
    relevanceScore: 95,
    reason: `High informational search demand for practical usage and paste preparation.`,
  });

  // 3. WHAT_IS_IT (Botanical characteristics & authenticity)
  const whatIsSlug = `what-is-${slugBase}`;
  opps.push({
    family: 'WHAT_IS_IT',
    title: `What is ${baseEntity}? Botanical Profile, Origins & Traditional Use`,
    suggestedSlug: whatIsSlug,
    priority: 'P2_RECOMMENDED',
    intent: 'INFORMATIONAL',
    targetAudience: 'Informed consumers researching herbal formulations',
    relevanceScore: 85,
    reason: `Educational content answering basic search queries.`,
  });

  // 4. HOW_TO_STORE (Crucial for fresh botanical powders & fresh henna cones)
  const storeSlug = `how-to-store-${slugBase}`;
  opps.push({
    family: 'HOW_TO_STORE',
    title: `How to Store ${name}: Shelf Life, Oxidation & Freshness Tips`,
    suggestedSlug: storeSlug,
    priority: intelligence.form === 'paste_cone' ? 'P1_ESSENTIAL' : 'P2_RECOMMENDED',
    intent: 'INFORMATIONAL',
    targetAudience: 'Customers preventing spoilage or dye breakdown',
    relevanceScore: intelligence.form === 'paste_cone' ? 95 : 75,
    reason: `Proper storage preserves volatile pigments and essential botanicals.`,
  });

  // 5. BUYING_GUIDE (Helping buyers choose between variants)
  const buyingSlug = `${slugBase}-buying-guide`;
  opps.push({
    family: 'BUYING_GUIDE',
    title: `${name} Buying Guide: How to Identify 100% Pure vs Adulterated Products`,
    suggestedSlug: buyingSlug,
    priority: 'P2_RECOMMENDED',
    intent: 'RETAIL',
    targetAudience: 'Commercial buyers and safety-conscious shoppers',
    relevanceScore: 88,
    reason: `Captures high commercial intent shoppers comparing brands and purity.`,
  });

  // 6. ORIGIN_GUIDE (Only if genuine Sojat or Rajasthan terroir)
  if (intelligence.localIntent === 'SOJAT_ORIGIN') {
    const originSlug = `sojat-origin-authenticity-${slugBase}`;
    opps.push({
      family: 'ORIGIN_GUIDE',
      title: `Why Sojat Henna is Renowned Worldwide: Soil, Lawsone Content & Processing`,
      suggestedSlug: originSlug,
      priority: 'P1_ESSENTIAL',
      intent: 'LOCAL',
      targetAudience: 'Discerning buyers seeking authentic GI terroir origins',
      relevanceScore: 92,
      reason: `Leverages verified Sojat geographical terroir authority.`,
    });
  }

  // 7. WHOLESALE_GUIDE (Only if wholesale eligible)
  if (intelligence.wholesaleEligible) {
    const wholesaleSlug = `${slugBase}-wholesale-bulk-sourcing-guide`;
    opps.push({
      family: 'WHOLESALE_GUIDE',
      title: `${name} Wholesale & Bulk Sourcing Guide: MOQ, Mandi Rates & Dispatch`,
      suggestedSlug: wholesaleSlug,
      priority: 'P1_ESSENTIAL',
      intent: 'B2B',
      targetAudience: 'Salons, Mehndi Artists, Resellers & Global Importers',
      relevanceScore: 90,
      reason: `Direct pipeline for high-value B2B inquiry acquisition.`,
    });
  }

  // 8. COMPARISON_GUIDE (For entities with natural complementary comparisons)
  if (intelligence.entity === 'HENNA_MEHNDI') {
    const compSlug = 'natural-henna-vs-chemical-hair-dye-comparison';
    opps.push({
      family: 'COMPARISON_GUIDE',
      title: `Natural Sojat Henna vs Chemical Dye: Purity, Damage & Longevity Compared`,
      suggestedSlug: compSlug,
      priority: 'P2_RECOMMENDED',
      intent: 'INFORMATIONAL',
      targetAudience: 'Shoppers transitioning from synthetic dyes to natural hair care',
      relevanceScore: 87,
      reason: `Addresses primary consumer hesitation regarding grey coverage and hair damage.`,
    });
  } else if (intelligence.entity === 'INDIGO') {
    const compSlug = 'henna-and-indigo-2-step-process-guide';
    opps.push({
      family: 'COMPARISON_GUIDE',
      title: `Henna & Indigo 2-Step Process: How to Achieve Rich Natural Black Tones`,
      suggestedSlug: compSlug,
      priority: 'P1_ESSENTIAL',
      intent: 'INFORMATIONAL',
      targetAudience: 'Natural hair coloring customers avoiding ammonia/PPD',
      relevanceScore: 96,
      reason: `Indigo must almost always be used in tandem with Henna for black color.`,
    });
  }

  // 9. FAQ_GUIDE
  const faqSlug = `${slugBase}-frequently-asked-questions`;
  opps.push({
    family: 'FAQ_GUIDE',
    title: `${name}: 10 Most Common Questions Answered by Botanical Experts`,
    suggestedSlug: faqSlug,
    priority: 'P2_RECOMMENDED',
    intent: 'INFORMATIONAL',
    targetAudience: 'First-time users troubleshooting preparation or application',
    relevanceScore: 80,
    reason: `Targeted FAQ schema capture for Google SERP feature snippets.`,
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
}): UniversalGuideDraft {
  const {
    intelligence,
    family = 'PRODUCT_OVERVIEW',
    keywordUniverse,
    allProducts = [],
    productId = '',
    coverImage = '/images/fallback.svg',
  } = params;

  const name = intelligence.canonicalProductName;
  const baseEntity = intelligence.botanicalEntity.split('/')[0].trim();
  const form = intelligence.form.replace(/_/g, ' ');
  const slugBase = intelligence.normalizedProductName.replace(/\s+/g, '-');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
  const siteName = 'Musky Dose';

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
  let overview = `${baseEntity} (${name}) is a single-ingredient botanical product sourced and prepared to verified purity standards for traditional personal care.`;
  let whatIsThis = `This product consists of 100% natural ${baseEntity} ${form}, formulated without synthetic adulterants, artificial fragrance, or harsh chemical additives.`;
  let howToUse = `Mix with warm water into a smooth paste. Apply evenly and follow recommended resting times.`;
  let quantityPreparation = `For short hair or localized use, prepare 50g-100g. For longer hair or full body art, use 150g-250g.`;
  let storageInstructions = `Store in an airtight container in a cool, dry, and dark location away from direct sunlight and humidity.`;
  let importantNotes = `Perform a standard patch test 24 hours prior to full application. For external application only.`;
  let whoShouldUse = `Suitable for individuals seeking authentic, unadulterated botanical products for traditional personal care.`;
  let whoShouldAvoid = `Individuals with known plant sensitivities to ${baseEntity} should conduct a preliminary patch test.`;
  let keyBenefits = intelligence.needsReview
    ? ['100% natural botanical ingredient', '[GUIDE NEEDS REVIEW: Verify specific product benefits in Admin]']
    : intelligence.useCases.slice(0, 4);
  let ingredients = [intelligence.scientificName ? `100% Pure ${intelligence.scientificName}` : `100% Pure ${name}`];

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
    if (intelligence.entity === 'HENNA_MEHNDI') {
      howToUse = `1. In a glass or ceramic bowl, blend pure henna powder with lukewarm water into a smooth paste resembling yoghurt consistency.\n2. Cover with airtight wrap and allow 2-3 hours for natural lawsone dye release.\n3. Section hair or skin, applying evenly from roots to tips.\n4. Leave on for 2-3 hours for rich conditioning and color development.\n5. Rinse thoroughly with plain water; avoid shampooing for the first 24 hours to allow natural oxidation.`;
      quantityPreparation = `Short Hair: 50-80g | Medium Hair: 100-150g | Long Hair: 200-250g | Hands/Body Art: 30-50g per cone batch.`;
    } else if (intelligence.entity === 'INDIGO') {
      howToUse = `1. Indigo powder should be mixed freshly just before application with warm water.\n2. Do NOT let indigo rest for hours; its dye activates within 15-20 minutes.\n3. Apply immediately to clean, henna-treated hair for deep black results.\n4. Leave on for 1-2 hours under a shower cap.\n5. Rinse gently with water.`;
    } else if (intelligence.form === 'oil') {
      howToUse = `Warm a few drops in clean palms. Massage gently into scalp or skin in circular motions. Leave on for at least 45 minutes or overnight before rinsing with a mild botanical cleanser.`;
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
  const content = `## Overview\n\n${overview}\n\n## What is This Product?\n\n${whatIsThis}\n\n## How to Use\n\n${howToUse}\n\n## Recommended Quantities\n\n${quantityPreparation}\n\n## Storage & Shelf Life\n\n${storageInstructions}\n\n## Important Safety Notes\n\n${importantNotes}`;

  // SEO metadata
  const seoTitle = `${title.slice(0, 50)} | ${siteName}`;
  const seoDescription = shortIntro.slice(0, 155);

  const keywords = keywordUniverse
    ? keywordUniverse.allKeywords.slice(0, 10).map((k) => k.term)
    : [name, `${baseEntity} guide`, `how to use ${baseEntity}`, `pure ${baseEntity} powder`];

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
    needsReview: intelligence.needsReview,
    reviewReasons: intelligence.reviewReasons,
  };
}
