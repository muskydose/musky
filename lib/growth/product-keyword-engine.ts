import { Product } from '@/lib/types';
import {
  GrowthKeyword,
  ProductKeywordTarget,
  ProductKeywordUniverse,
  KeywordCategoryType,
  SearchIntentType,
  ProductKeywordStatus,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getKeywords } from './growth-db';

/**
 * Botanical synonym and entity knowledge base
 * Allows dynamic keyword derivation for Indian botanical products
 */
interface BotanicalEntity {
  rootNames: string[];
  scientificName: string[];
  ayurvedicNames: string[];
  englishNames: string[];
  originRegions: string[];
  standardForms: string[];
  primaryBenefits: string[];
  primaryUseCases: string[];
  semanticThemes: string[];
}

const BOTANICAL_KNOWLEDGE: Record<string, BotanicalEntity> = {
  henna: {
    rootNames: ['henna', 'mehndi', 'mehandi', 'hina'],
    scientificName: ['lawsonia inermis'],
    ayurvedicNames: ['madayantika', 'mehendi'],
    englishNames: ['henna powder', 'herbal hair color', 'natural dye'],
    originRegions: ['Sojat', 'Pali', 'Rajasthan', 'Marwar'],
    standardForms: ['powder', 'leaves', 'paste', 'cone', 'oil'],
    primaryBenefits: ['hair conditioning', 'natural hair color', 'grey hair coverage', 'scalp cooling', 'anti dandruff'],
    primaryUseCases: ['hair pack', 'hair dye', 'bridal mehndi', 'scalp pack', 'hair wash'],
    semanticThemes: ['natural hair coloring', 'ayurvedic hair care', 'chemical free dye', 'plant based color'],
  },
  amla: {
    rootNames: ['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'nellikai'],
    scientificName: ['phyllanthus emblica', 'emblica officinalis'],
    ayurvedicNames: ['amalaki', 'dhatri'],
    englishNames: ['amla fruit powder', 'indian gooseberry powder'],
    originRegions: ['Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Pratapgarh'],
    standardForms: ['powder', 'dry pieces', 'juice', 'oil'],
    primaryBenefits: ['hair fall control', 'hair growth', 'premature greying', 'vitamin c boost', 'hair shine'],
    primaryUseCases: ['hair pack', 'face pack', 'hair oil infusion', 'ayurvedic hair cleanser'],
    semanticThemes: ['herbal hair care', 'ayurvedic rasayana', 'natural vitamin c', 'hair strengthening'],
  },
  indigo: {
    rootNames: ['indigo', 'neel', 'nili', 'avuri'],
    scientificName: ['indigofera tinctoria'],
    ayurvedicNames: ['nili', 'nilini'],
    englishNames: ['indigo powder', 'black hair dye', 'blue dye'],
    originRegions: ['Rajasthan', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh'],
    standardForms: ['powder', 'leaves'],
    primaryBenefits: ['black hair stain', 'natural hair color', 'chemical free black dye', 'hair conditioning'],
    primaryUseCases: ['2 step henna indigo process', 'black hair pack', 'hair coloring'],
    semanticThemes: ['natural black hair dye', 'ayurvedic hair color', 'organic indigo hair care'],
  },
  rose: {
    rootNames: ['rose water', 'gulab jal', 'damask rose', 'rose'],
    scientificName: ['rosa damascena'],
    ayurvedicNames: ['shatapatri', 'gulab'],
    englishNames: ['pure damask rose water', 'rose hydrosol', 'steam distilled rose water'],
    originRegions: ['Pushkar', 'Haldighati', 'Ajmer', 'Rajasthan', 'Kannauj'],
    standardForms: ['mist spray', 'distillate', 'hydrosol', 'petals powder'],
    primaryBenefits: ['skin toner', 'face mist', 'skin hydration', 'pore tightening', 'soothing redness'],
    primaryUseCases: ['face toner', 'diy face pack mixer', 'cooling eye splash', 'daily skin refresh'],
    semanticThemes: ['pure botanical skincare', 'steam distilled hydrosol', 'chemical free toner'],
  },
  reetha: {
    rootNames: ['reetha', 'soapnut', 'aritha', 'kunkudukaya', 'boondi kottai'],
    scientificName: ['sapindus mukorossi', 'sapindus trifoliatus'],
    ayurvedicNames: ['arishta', 'phenila'],
    englishNames: ['soapnut powder', 'natural hair cleanser'],
    originRegions: ['Rajasthan', 'Himalayas', 'Maharashtra'],
    standardForms: ['powder', 'whole shells', 'liquid extract'],
    primaryBenefits: ['natural foaming cleanser', 'anti dandruff', 'gentle scalp cleaning', 'oil control'],
    primaryUseCases: ['hair wash', 'natural shampoo', 'diy hair cleanser'],
    semanticThemes: ['natural saponin shampoo', 'chemical free hair wash', 'ayurvedic scalp cleanser'],
  },
  shikakai: {
    rootNames: ['shikakai', 'seeyakkai', 'chikakai', 'soap pod'],
    scientificName: ['senegalia rugata', 'acacia concinna'],
    ayurvedicNames: ['saptala', 'shikha'],
    englishNames: ['shikakai fruit powder', 'fruit for hair'],
    originRegions: ['Central India', 'Rajasthan', 'Deccan'],
    standardForms: ['powder', 'dry pods'],
    primaryBenefits: ['low ph hair cleanser', 'hair detangler', 'hair softness', 'dandruff prevention'],
    primaryUseCases: ['hair wash', 'hair pack', 'herbal shampoo'],
    semanticThemes: ['low ph botanical cleanser', 'traditional hair cleanser', 'natural conditioning'],
  },
  neem: {
    rootNames: ['neem', 'margosa', 'veppilai', 'nimba'],
    scientificName: ['azadirachta indica'],
    ayurvedicNames: ['nimba', 'arista'],
    englishNames: ['neem leaf powder', 'organic neem powder'],
    originRegions: ['Rajasthan', 'Marwar', 'Gujarat', 'Uttar Pradesh'],
    standardForms: ['powder', 'leaves', 'oil'],
    primaryBenefits: ['anti bacterial', 'anti fungal', 'acne control', 'dandruff treatment', 'blood purifying'],
    primaryUseCases: ['face pack for acne', 'scalp pack for dandruff', 'skin soothing'],
    semanticThemes: ['ayurvedic antibacterial care', 'clarifying botanical face pack', 'scalp detox'],
  },
};

/**
 * Normalizes keyword string (lowercase, trim, punctuation cleanup)
 */
export function normalizeKeywordTerm(term: string): string {
  if (!term || typeof term !== 'string') return '';
  return term
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, ' ') // Keep alphanumeric, Hindi devanagari, hyphen
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects matching botanical profile from product attributes
 */
function detectBotanicalProfile(product: Partial<Product>): BotanicalEntity | null {
  const combinedText = [
    product.name || '',
    product.slug || '',
    product.categoryName || '',
    product.productType || '',
    ...(product.ingredients || []),
    ...(product.benefits || []),
    product.shortDescription || '',
  ].join(' ').toLowerCase();

  for (const [key, profile] of Object.entries(BOTANICAL_KNOWLEDGE)) {
    if (combinedText.includes(key)) return profile;
    if (profile.rootNames.some((r) => combinedText.includes(r))) return profile;
    if (profile.scientificName.some((s) => combinedText.includes(s))) return profile;
  }
  return null;
}

/**
 * Derives root seed terms from product name & attributes
 */
function extractSeedTerms(product: Partial<Product>): string[] {
  const name = normalizeKeywordTerm(product.name || '');
  const seeds = new Set<string>();

  if (name) seeds.add(name);

  // Clean brand prefix
  const cleanWithoutBrand = name.replace(/^(musky dose|pure|organic|natural|authentic|sojat)\s+/i, '').trim();
  if (cleanWithoutBrand && cleanWithoutBrand.length > 2) {
    seeds.add(cleanWithoutBrand);
  }

  const botanical = detectBotanicalProfile(product);
  if (botanical) {
    botanical.rootNames.forEach((r) => seeds.add(r));
  }

  return Array.from(seeds).filter((s) => s.length >= 3);
}

/**
 * Autonomous Product Keyword Universe Generator
 * Generates comprehensive, categorized keywords for any product
 */
export function generateProductKeywordUniverse(
  product: Product,
  verifiedKeywords: GrowthKeyword[] = []
): ProductKeywordUniverse {
  const productId = product.id;
  const productName = product.name || 'Botanical Product';
  const categoryName = product.categoryName || 'Herbal Care';
  const cleanSlug = product.slug || 'product';

  const seeds = extractSeedTerms(product);
  const botanical = detectBotanicalProfile(product);
  const rootBotanical = seeds[0] || normalizeKeywordTerm(productName);

  // Keyword target collector map (keyed by normalized keyword text)
  const kwMap = new Map<string, {
    keyword: string;
    keywordType: KeywordCategoryType;
    relevanceScore: number;
    searchIntent: SearchIntentType;
    generatedFrom: string;
  }>();

  function addCandidate(
    rawText: string,
    type: KeywordCategoryType,
    relevance: number,
    intent: SearchIntentType,
    source: string
  ) {
    const norm = normalizeKeywordTerm(rawText);
    if (!norm || norm.length < 3 || norm.length > 80) return;
    if (kwMap.has(norm)) {
      const existing = kwMap.get(norm)!;
      if (relevance > existing.relevanceScore) {
        existing.relevanceScore = relevance;
        existing.keywordType = type;
        existing.searchIntent = intent;
        existing.generatedFrom = source;
      }
    } else {
      kwMap.set(norm, {
        keyword: norm,
        keywordType: type,
        relevanceScore: relevance,
        searchIntent: intent,
        generatedFrom: source,
      });
    }
  }

  // 1. PRIMARY KEYWORDS (Direct identity, botanical core)
  addCandidate(productName, 'PRIMARY', 100, 'COMMERCIAL', 'product_name');
  addCandidate(rootBotanical, 'PRIMARY', 95, 'INFORMATIONAL', 'botanical_root');
  addCandidate(`pure ${rootBotanical}`, 'PRIMARY', 92, 'COMMERCIAL', 'purity_modifier');
  addCandidate(`natural ${rootBotanical}`, 'PRIMARY', 90, 'COMMERCIAL', 'natural_modifier');
  addCandidate(`organic ${rootBotanical}`, 'PRIMARY', 90, 'COMMERCIAL', 'organic_modifier');
  addCandidate(`100% pure ${rootBotanical}`, 'PRIMARY', 88, 'COMMERCIAL', 'authenticity_modifier');

  // 2. SECONDARY KEYWORDS (Form + category combinations)
  if (product.productType) {
    addCandidate(`${rootBotanical} ${product.productType}`, 'SECONDARY', 85, 'COMMERCIAL', 'product_type');
  }
  addCandidate(`${rootBotanical} for hair`, 'SECONDARY', 85, 'INFORMATIONAL', 'usage_scope');
  addCandidate(`herbal ${rootBotanical}`, 'SECONDARY', 82, 'COMMERCIAL', 'herbal_modifier');
  addCandidate(`ayurvedic ${rootBotanical}`, 'SECONDARY', 82, 'COMMERCIAL', 'ayurvedic_modifier');
  addCandidate(`raw ${rootBotanical} powder`, 'SECONDARY', 80, 'COMMERCIAL', 'raw_form');

  // 3. LONG-TAIL KEYWORDS (Specific buyer searches)
  addCandidate(`100 pure organic ${rootBotanical}`, 'LONG_TAIL', 78, 'COMMERCIAL', 'long_tail_grade');
  addCandidate(`chemical free ${rootBotanical} for hair`, 'LONG_TAIL', 76, 'COMMERCIAL', 'safety_focus');
  addCandidate(`best quality ${rootBotanical} in india`, 'LONG_TAIL', 75, 'COMMERCIAL', 'quality_search');
  addCandidate(`unadulterated shade dried ${rootBotanical}`, 'LONG_TAIL', 72, 'COMMERCIAL', 'processing_method');
  addCandidate(`fresh crop micro fine ${rootBotanical}`, 'LONG_TAIL', 70, 'COMMERCIAL', 'texture_modifier');

  // 4. QUESTION KEYWORDS (Natural informational intent)
  addCandidate(`how to use ${rootBotanical}`, 'QUESTION', 85, 'INFORMATIONAL', 'how_to_usage');
  addCandidate(`how to apply ${rootBotanical} on hair`, 'QUESTION', 82, 'INFORMATIONAL', 'application_query');
  addCandidate(`is ${rootBotanical} good for hair growth`, 'QUESTION', 80, 'INFORMATIONAL', 'benefit_inquiry');
  addCandidate(`which ${rootBotanical} is best in india`, 'QUESTION', 78, 'INFORMATIONAL', 'comparison_query');
  addCandidate(`how long to leave ${rootBotanical} on hair`, 'QUESTION', 75, 'INFORMATIONAL', 'timing_query');
  addCandidate(`how to mix ${rootBotanical} for best results`, 'QUESTION', 74, 'INFORMATIONAL', 'preparation_query');

  // 5. BUYER INTENT KEYWORDS (High purchase readiness)
  addCandidate(`buy ${rootBotanical} online`, 'BUYER_INTENT', 90, 'TRANSACTIONAL', 'ecommerce_buy');
  addCandidate(`buy pure ${rootBotanical}`, 'BUYER_INTENT', 88, 'TRANSACTIONAL', 'ecommerce_buy_pure');
  addCandidate(`best ${rootBotanical} brand in india`, 'BUYER_INTENT', 85, 'COMMERCIAL', 'brand_discovery');
  addCandidate(`order natural ${rootBotanical}`, 'BUYER_INTENT', 84, 'TRANSACTIONAL', 'ecommerce_order');
  addCandidate(`${rootBotanical} price 250g`, 'BUYER_INTENT', 82, 'TRANSACTIONAL', 'price_discovery');
  addCandidate(`${rootBotanical} bulk supplier`, 'BUYER_INTENT', 75, 'TRANSACTIONAL', 'wholesale_intent');

  // 6. BENEFIT KEYWORDS (Derived from product benefits array)
  if (Array.isArray(product.benefits) && product.benefits.length > 0) {
    product.benefits.forEach((benefit) => {
      const cleanBenefit = normalizeKeywordTerm(benefit)
        .replace(/^(helps in|promotes|provides|gives|contains|delivers)\s+/i, '')
        .trim();
      if (cleanBenefit.length > 3 && cleanBenefit.length < 40) {
        addCandidate(`${rootBotanical} for ${cleanBenefit}`, 'BENEFIT', 80, 'INFORMATIONAL', 'benefit_mapping');
      }
    });
  }
  if (botanical) {
    botanical.primaryBenefits.forEach((b) => {
      addCandidate(`${rootBotanical} for ${b}`, 'BENEFIT', 78, 'INFORMATIONAL', 'botanical_knowledge_benefit');
    });
  }

  // 7. USE CASE KEYWORDS (Derived from usageInstructions & botanical regimens)
  addCandidate(`${rootBotanical} hair pack`, 'USE_CASE', 84, 'INFORMATIONAL', 'regimen_pack');
  addCandidate(`${rootBotanical} hair mask`, 'USE_CASE', 82, 'INFORMATIONAL', 'regimen_mask');
  addCandidate(`${rootBotanical} scalp treatment`, 'USE_CASE', 78, 'INFORMATIONAL', 'regimen_scalp');
  if (botanical) {
    botanical.primaryUseCases.forEach((u) => {
      addCandidate(`${rootBotanical} ${u}`, 'USE_CASE', 76, 'INFORMATIONAL', 'botanical_knowledge_usecase');
    });
  }

  // 8. INGREDIENT KEYWORDS (Scientific and botanical synonym matching)
  if (Array.isArray(product.ingredients) && product.ingredients.length > 0) {
    product.ingredients.forEach((ing) => {
      const cleanIng = normalizeKeywordTerm(ing)
        .replace(/^(100% pure|pure|organic|natural|certified)\s+/i, '')
        .trim();
      if (cleanIng.length > 3 && cleanIng.length < 50) {
        addCandidate(cleanIng, 'INGREDIENT', 75, 'INFORMATIONAL', 'ingredient_list');
      }
    });
  }
  if (botanical) {
    botanical.scientificName.forEach((sci) => {
      addCandidate(sci, 'INGREDIENT', 72, 'INFORMATIONAL', 'scientific_name');
    });
    botanical.ayurvedicNames.forEach((ayu) => {
      addCandidate(ayu, 'INGREDIENT', 70, 'INFORMATIONAL', 'ayurvedic_name');
    });
  }

  // 9. REGIONAL KEYWORDS (Heritage & Geographic Candidate Discovery)
  const origins = botanical?.originRegions || ['Sojat', 'Pali', 'Rajasthan', 'Jaipur'];
  origins.forEach((reg) => {
    addCandidate(`${reg.toLowerCase()} ${rootBotanical}`, 'REGIONAL', 84, 'COMMERCIAL', 'origin_discovery');
    addCandidate(`${rootBotanical} ${reg.toLowerCase()}`, 'REGIONAL', 82, 'COMMERCIAL', 'geographic_demand');
  });
  addCandidate(`rajasthan herbal ${rootBotanical}`, 'REGIONAL', 76, 'COMMERCIAL', 'state_heritage');
  addCandidate(`sojat ${rootBotanical} manufacturer`, 'REGIONAL', 74, 'TRANSACTIONAL', 'b2b_regional');

  // 10. SEMANTIC & RELATED KEYWORDS (Broad botanical topic cluster)
  if (botanical) {
    botanical.semanticThemes.forEach((theme) => {
      addCandidate(theme, 'SEMANTIC', 70, 'INFORMATIONAL', 'semantic_theme');
    });
  }
  addCandidate(`musky dose ${rootBotanical}`, 'SEMANTIC', 88, 'NAVIGATIONAL', 'brand_combination');
  addCandidate('chemical free botanical hair care', 'SEMANTIC', 65, 'INFORMATIONAL', 'general_category');

  // Build verified lookup map for instant enrichment
  const verifiedMap = new Map<string, GrowthKeyword>();
  verifiedKeywords.forEach((vk) => {
    if (vk.keyword) {
      verifiedMap.set(normalizeKeywordTerm(vk.keyword), vk);
    }
  });

  const allTargets: ProductKeywordTarget[] = [];
  const now = new Date().toISOString();

  kwMap.forEach((meta, kwText) => {
    const verified = verifiedMap.get(kwText);
    const hasVerifiedData = Boolean(verified && verified.searchVolume !== null && verified.searchVolume !== undefined);

    let status: ProductKeywordStatus = 'DISCOVERED';
    let isOpp = false;
    let oppReason: string | undefined;

    if (hasVerifiedData) {
      status = 'VERIFIED';
      if ((verified!.searchVolume || 0) >= 5000) {
        isOpp = true;
        oppReason = `High verified search volume (${verified!.searchVolume!.toLocaleString()}/mo) for this target.`;
      }
    } else if (meta.keywordType === 'QUESTION' && meta.relevanceScore >= 80) {
      isOpp = true;
      oppReason = 'High relevance user question. Recommended for product FAQs or product guide content.';
    } else if (meta.keywordType === 'BUYER_INTENT' && meta.relevanceScore >= 85) {
      isOpp = true;
      oppReason = 'High purchase intent keyword. Recommended for meta description & SEO title.';
    }

    const cleanKwId = kwText.replace(/[^a-z0-9]/g, '_');
    const targetId = `pkw_${productId}_${cleanKwId}`;

    allTargets.push({
      id: targetId,
      productId: productId,
      productName: productName,
      category: categoryName,
      keyword: kwText,
      keywordType: meta.keywordType,
      relevanceScore: meta.relevanceScore,
      searchIntent: meta.searchIntent,
      generatedFrom: meta.generatedFrom,
      status: status,
      isActive: product.isActive ?? true,
      isOpportunity: isOpp,
      opportunityReason: oppReason,
      // Strictly null until verified by real source data
      verifiedSearchVolume: verified?.searchVolume ?? null,
      verifiedCpc: verified?.cpc ?? null,
      verifiedCompetition: verified?.competition ?? null,
      verifiedTrend: verified?.trend ?? null,
      verifiedSourceName: verified?.sourceName ?? null,
      verifiedCollectedAt: verified?.collectedAt ?? null,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Sort by relevance score descending
  allTargets.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Group by category type
  const groupedByType: Record<KeywordCategoryType, ProductKeywordTarget[]> = {
    PRIMARY: [],
    SECONDARY: [],
    LONG_TAIL: [],
    QUESTION: [],
    BUYER_INTENT: [],
    BENEFIT: [],
    USE_CASE: [],
    INGREDIENT: [],
    REGIONAL: [],
    SEMANTIC: [],
  };

  allTargets.forEach((t) => {
    if (groupedByType[t.keywordType]) {
      groupedByType[t.keywordType].push(t);
    }
  });

  const verifiedTargets = allTargets.filter((t) => t.status === 'VERIFIED');
  const opportunityTargets = allTargets.filter((t) => t.isOpportunity);

  return {
    productId,
    productName,
    slug: cleanSlug,
    categoryName,
    totalKeywords: allTargets.length,
    verifiedCount: verifiedTargets.length,
    opportunityCount: opportunityTargets.length,
    keywords: allTargets,
    groupedByType,
    topOpportunities: opportunityTargets.slice(0, 10),
    suggestedPrimary: groupedByType.PRIMARY[0]?.keyword || productName,
    suggestedSecondary: groupedByType.SECONDARY.slice(0, 5).map((k) => k.keyword),
    suggestedLongTail: groupedByType.LONG_TAIL.slice(0, 5).map((k) => k.keyword),
    suggestedQuestions: groupedByType.QUESTION.slice(0, 5).map((k) => k.keyword),
    lastGeneratedAt: now,
  };
}

/**
 * Fast in-memory cache for product keyword universes
 * Prevents redundant computations while serving high-throughput requests
 */
const universeCache = new Map<string, ProductKeywordUniverse>();

/**
 * Fetches or generates keyword universe for a single product
 */
export async function getProductKeywordUniverse(product: Product): Promise<ProductKeywordUniverse> {
  const cached = universeCache.get(product.id);
  if (cached && (Date.now() - new Date(cached.lastGeneratedAt).getTime()) < 300000) {
    return cached;
  }

  let verifiedKeywords: GrowthKeyword[] = [];
  try {
    verifiedKeywords = await getKeywords();
  } catch (err) {
    console.warn('[getProductKeywordUniverse] Could not load verified growth keywords:', err);
  }

  const universe = generateProductKeywordUniverse(product, verifiedKeywords);
  universeCache.set(product.id, universe);
  return universe;
}

/**
 * Background / Deferred synchronization hook for product lifecycle
 * Automatically syncs generated keywords and connects verified demand
 */
export async function syncProductKeywordUniverse(product: Product): Promise<ProductKeywordUniverse> {
  const universe = await getProductKeywordUniverse(product);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    // Run background persistence safely without failing product saving
    Promise.resolve().then(async () => {
      try {
        // Sync to growth_keywords with product association
        const payload = universe.keywords.map((k) => ({
          id: k.id,
          keyword: k.keyword,
          language: 'en',
          country: 'India',
          category: k.category,
          product_id: k.productId,
          search_volume: k.verifiedSearchVolume || null,
          competition: k.verifiedCompetition === 'LOW' ? 0.2 : (k.verifiedCompetition === 'HIGH' ? 0.85 : (k.verifiedCompetition === 'MEDIUM' ? 0.5 : null)),
          cpc: k.verifiedCpc || null,
          trend: k.verifiedTrend || null,
          source_tier: k.status === 'VERIFIED' ? 'VERIFIED' : 'GENERATED',
          source_name: k.verifiedSourceName || 'Product Keyword Intelligence Engine',
          collected_at: k.createdAt,
          updated_at: k.updatedAt,
        }));

        // Batch upsert in chunks of 50 to ensure high performance
        for (let i = 0; i < payload.length; i += 50) {
          const chunk = payload.slice(i, i + 50);
          await supabase.from('growth_keywords').upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
        }
      } catch (dbErr) {
        console.warn(`[syncProductKeywordUniverse] Non-blocking DB sync warning for ${product.id}:`, dbErr);
      }
    });
  }

  return universe;
}

/**
 * Handles product deletion: safely archives product associations without destroying shared keywords
 */
export async function onProductDeletedLifecycle(productId: string): Promise<void> {
  universeCache.delete(productId);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      // Remove product association from verified records and delete generated-only entries
      await supabase.from('growth_keywords').delete().eq('product_id', productId).eq('source_tier', 'GENERATED');
      await supabase.from('growth_keywords').update({ product_id: null }).eq('product_id', productId);
      await supabase.from('seo_keywords').delete().eq('target_type', 'product').eq('target_id', productId);
    } catch (err) {
      console.warn(`[onProductDeletedLifecycle] Warning cleaning keywords for ${productId}:`, err);
    }
  }
}

/**
 * Handles product status change (Active <-> Inactive)
 */
export async function onProductStatusChanged(productId: string, isActive: boolean): Promise<void> {
  const cached = universeCache.get(productId);
  if (cached) {
    cached.keywords.forEach((k) => (k.isActive = isActive));
  }
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('seo_keywords').update({ active: isActive }).eq('target_type', 'product').eq('target_id', productId);
    } catch (err) {
      console.warn(`[onProductStatusChanged] Status update warning for ${productId}:`, err);
    }
  }
}
