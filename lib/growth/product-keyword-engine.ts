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
export type BotanicalScope = 'HAIR' | 'SKIN' | 'BODY_ART' | 'HERBAL' | 'WHOLESALE';

interface BotanicalEntity {
  key: string;
  rootNames: string[];
  scientificName: string[];
  ayurvedicNames: string[];
  englishNames: string[];
  originRegions: string[];
  standardForms: string[];
  primaryBenefits: string[];
  primaryUseCases: string[];
  semanticThemes: string[];
  primaryScope: BotanicalScope;
  suggestedCategorySlug: string;
  suggestedGuideSlugs: string[];
}

const BOTANICAL_KNOWLEDGE: Record<string, BotanicalEntity> = {
  henna: {
    key: 'henna',
    rootNames: ['henna', 'mehndi', 'mehandi', 'mehendi', 'hina', 'heena'],
    scientificName: ['lawsonia inermis'],
    ayurvedicNames: ['madayantika', 'mehendi'],
    englishNames: ['henna powder', 'herbal hair color', 'natural dye', 'body art henna'],
    originRegions: ['Sojat', 'Pali', 'Rajasthan', 'Marwar'],
    standardForms: ['powder', 'leaves', 'paste', 'cone', 'oil'],
    primaryBenefits: ['hair conditioning', 'natural hair color', 'grey hair coverage', 'scalp cooling', 'anti dandruff', 'deep mahogany stain'],
    primaryUseCases: ['hair pack', 'hair dye', 'bridal mehndi', 'cone making', 'body art'],
    semanticThemes: ['natural hair coloring', 'ayurvedic hair care', 'chemical free dye', 'plant based color', 'bridal body art'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'henna',
    suggestedGuideSlugs: ['sojat-henna-powder-complete-guide', 'which-henna-powder-is-right-for-you'],
  },
  baq_henna: {
    key: 'baq_henna',
    rootNames: ['baq henna', 'body art quality henna', 'baq mehndi', 'bridal henna powder'],
    scientificName: ['lawsonia inermis'],
    ayurvedicNames: ['madayantika'],
    englishNames: ['body art quality henna powder', 'professional henna powder', 'henna powder for cones'],
    originRegions: ['Sojat', 'Pali', 'Rajasthan'],
    standardForms: ['powder', 'cone', 'paste'],
    primaryBenefits: ['ultra fine stringy paste', 'deep dark stain', 'clog free cone application', 'pure lawsone density'],
    primaryUseCases: ['bridal mehndi', 'professional mehndi cones', 'body art henna tattoo'],
    semanticThemes: ['body art quality', 'professional mehndi artist', 'stringy cone paste'],
    primaryScope: 'BODY_ART',
    suggestedCategorySlug: 'henna',
    suggestedGuideSlugs: ['sojat-henna-powder-complete-guide'],
  },
  indigo: {
    key: 'indigo',
    rootNames: ['indigo', 'neel', 'nili', 'avuri', 'neelam'],
    scientificName: ['indigofera tinctoria'],
    ayurvedicNames: ['nili', 'nilini'],
    englishNames: ['indigo powder', 'black hair dye', 'organic indigo powder'],
    originRegions: ['Rajasthan', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh'],
    standardForms: ['powder', 'leaves'],
    primaryBenefits: ['black hair stain', 'natural hair color', 'chemical free black dye', 'hair conditioning'],
    primaryUseCases: ['2 step henna indigo process', 'black hair pack', 'hair coloring'],
    semanticThemes: ['natural black hair dye', 'ayurvedic hair color', 'organic indigo hair care'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: ['how-to-use-natural-indigo-powder-for-black-hair'],
  },
  amla: {
    key: 'amla',
    rootNames: ['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'nellikai'],
    scientificName: ['phyllanthus emblica', 'emblica officinalis'],
    ayurvedicNames: ['amalaki', 'dhatri'],
    englishNames: ['amla fruit powder', 'indian gooseberry powder'],
    originRegions: ['Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Pratapgarh'],
    standardForms: ['powder', 'dry pieces', 'juice', 'oil'],
    primaryBenefits: ['hair fall control', 'hair root strengthening', 'premature greying', 'vitamin c boost', 'hair shine'],
    primaryUseCases: ['hair pack', 'hair oil infusion', 'ayurvedic hair cleanser', 'diy hair mask'],
    semanticThemes: ['herbal hair care', 'ayurvedic rasayana', 'natural vitamin c', 'hair strengthening'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: ['which-henna-powder-is-right-for-you'],
  },
  hibiscus: {
    key: 'hibiscus',
    rootNames: ['hibiscus', 'gudhal', 'jaswand', 'chembarathi', 'javakusuma'],
    scientificName: ['hibiscus rosa-sinensis'],
    ayurvedicNames: ['japa', 'javakusuma'],
    englishNames: ['hibiscus flower powder', 'hibiscus petal powder', 'hibiscus hair mask'],
    originRegions: ['Rajasthan', 'Kerala', 'Maharashtra'],
    standardForms: ['powder', 'dried flowers'],
    primaryBenefits: ['deep hair conditioning', 'hair follicle stimulation', 'natural moisture retention', 'frizz control'],
    primaryUseCases: ['hair mask', 'hair conditioning pack', 'diy hair oil'],
    semanticThemes: ['natural hair conditioner', 'ayurvedic scalp health', 'botanical hair softening'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: ['which-henna-powder-is-right-for-you'],
  },
  rose: {
    key: 'rose',
    rootNames: ['rose water', 'gulab jal', 'damask rose', 'rose petal', 'rose powder'],
    scientificName: ['rosa damascena'],
    ayurvedicNames: ['shatapatri', 'gulab', 'taruni'],
    englishNames: ['pure damask rose water', 'rose hydrosol', 'rose petal powder'],
    originRegions: ['Pushkar', 'Haldighati', 'Ajmer', 'Rajasthan', 'Kannauj'],
    standardForms: ['mist spray', 'distillate', 'hydrosol', 'powder'],
    primaryBenefits: ['skin toner', 'face mist', 'skin hydration', 'pore tightening', 'soothing redness'],
    primaryUseCases: ['face toner', 'diy face pack mixer', 'cooling eye splash', 'daily skin refresh'],
    semanticThemes: ['pure botanical skincare', 'steam distilled hydrosol', 'chemical free toner'],
    primaryScope: 'SKIN',
    suggestedCategorySlug: 'face-care',
    suggestedGuideSlugs: [],
  },
  moringa: {
    key: 'moringa',
    rootNames: ['moringa', 'sahjan', 'drumstick leaves', 'munagaku', 'murungai'],
    scientificName: ['moringa oleifera'],
    ayurvedicNames: ['shigru', 'sobhanjana'],
    englishNames: ['moringa leaf powder', 'organic moringa powder'],
    originRegions: ['Rajasthan', 'Tamil Nadu', 'Andhra Pradesh'],
    standardForms: ['powder', 'dried leaves'],
    primaryBenefits: ['rich botanical nutrients', 'amino acid nourishment', 'skin and scalp vitality'],
    primaryUseCases: ['herbal wellness pack', 'botanical hair pack', 'diy herbal infusion'],
    semanticThemes: ['ayurvedic superfood botanical', 'pure leaf powder', 'natural nutrient dense herb'],
    primaryScope: 'HERBAL',
    suggestedCategorySlug: 'herbal-products',
    suggestedGuideSlugs: [],
  },
  beetroot: {
    key: 'beetroot',
    rootNames: ['beetroot', 'chukandar', 'beet root powder'],
    scientificName: ['beta vulgaris'],
    ayurvedicNames: ['raktagandika', 'palanki'],
    englishNames: ['beetroot powder', 'natural beetroot herbal powder'],
    originRegions: ['Rajasthan', 'Maharashtra', 'Karnataka'],
    standardForms: ['powder', 'dehydrated flakes'],
    primaryBenefits: ['natural pink botanical tint', 'skin radiance', 'scalp cleansing'],
    primaryUseCases: ['face glow pack', 'botanical tint pack', 'diy hair & skin recipe'],
    semanticThemes: ['natural colorant', 'glow face mask', 'botanical skincare herb'],
    primaryScope: 'SKIN',
    suggestedCategorySlug: 'face-care',
    suggestedGuideSlugs: [],
  },
  reetha: {
    key: 'reetha',
    rootNames: ['reetha', 'soapnut', 'aritha', 'kunkudukaya', 'boondi kottai'],
    scientificName: ['sapindus mukorossi', 'sapindus trifoliatus'],
    ayurvedicNames: ['arishta', 'phenila'],
    englishNames: ['soapnut powder', 'natural hair cleanser'],
    originRegions: ['Rajasthan', 'Himalayas', 'Maharashtra'],
    standardForms: ['powder', 'whole shells', 'liquid extract'],
    primaryBenefits: ['natural foaming cleanser', 'anti dandruff', 'gentle scalp cleaning', 'oil control'],
    primaryUseCases: ['hair wash', 'natural shampoo', 'diy hair cleanser'],
    semanticThemes: ['natural saponin shampoo', 'chemical free hair wash', 'ayurvedic scalp cleanser'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: ['which-henna-powder-is-right-for-you'],
  },
  shikakai: {
    key: 'shikakai',
    rootNames: ['shikakai', 'seeyakkai', 'chikakai', 'soap pod'],
    scientificName: ['senegalia rugata', 'acacia concinna'],
    ayurvedicNames: ['saptala', 'shikha'],
    englishNames: ['shikakai fruit powder', 'fruit for hair'],
    originRegions: ['Central India', 'Rajasthan', 'Deccan'],
    standardForms: ['powder', 'dry pods'],
    primaryBenefits: ['low ph hair cleanser', 'hair detangler', 'hair softness', 'dandruff prevention'],
    primaryUseCases: ['hair wash', 'hair pack', 'herbal shampoo'],
    semanticThemes: ['low ph botanical cleanser', 'traditional hair cleanser', 'natural conditioning'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: ['which-henna-powder-is-right-for-you'],
  },
  neem: {
    key: 'neem',
    rootNames: ['neem', 'margosa', 'veppilai', 'nimba'],
    scientificName: ['azadirachta indica'],
    ayurvedicNames: ['nimba', 'arista'],
    englishNames: ['neem leaf powder', 'organic neem powder'],
    originRegions: ['Rajasthan', 'Marwar', 'Gujarat', 'Uttar Pradesh'],
    standardForms: ['powder', 'leaves', 'oil'],
    primaryBenefits: ['anti bacterial', 'anti fungal', 'acne control', 'dandruff treatment', 'scalp clarifying'],
    primaryUseCases: ['face pack for acne', 'scalp pack for dandruff', 'skin soothing'],
    semanticThemes: ['ayurvedic antibacterial care', 'clarifying botanical face pack', 'scalp detox'],
    primaryScope: 'SKIN',
    suggestedCategorySlug: 'herbal-products',
    suggestedGuideSlugs: [],
  },
  brahmi: {
    key: 'brahmi',
    rootNames: ['brahmi', 'bacopa', 'jalaneem', 'nirbrahmi'],
    scientificName: ['bacopa monnieri'],
    ayurvedicNames: ['brahmi', 'saraswati'],
    englishNames: ['brahmi powder', 'ayurvedic brahmi leaf powder'],
    originRegions: ['Rajasthan', 'Kerala', 'Bengal'],
    standardForms: ['powder', 'leaves', 'oil'],
    primaryBenefits: ['scalp cooling', 'hair root strengthening', 'stress relief'],
    primaryUseCases: ['hair pack', 'hair oil formulation', 'herbal scalp massage'],
    semanticThemes: ['traditional ayurvedic herb', 'cooling scalp care', 'hair root rejuvenation'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: [],
  },
  bhringraj: {
    key: 'bhringraj',
    rootNames: ['bhringraj', 'bringha', 'keshraj', 'karisalankanni', 'false daisy'],
    scientificName: ['eclipta prostrata', 'eclipta alba'],
    ayurvedicNames: ['bhringaraja', 'kesharaja'],
    englishNames: ['bhringraj powder', 'king of hair herb'],
    originRegions: ['Rajasthan', 'Southern India', 'Uttar Pradesh'],
    standardForms: ['powder', 'leaves', 'oil'],
    primaryBenefits: ['hair follicle activation', 'hair shine enhancement', 'natural dark hair maintenance'],
    primaryUseCases: ['hair pack', 'ayurvedic hair oil infusion', 'herbal hair wash'],
    semanticThemes: ['ayurvedic king of hair', 'natural dark hair vitality', 'hair root booster'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: [],
  },
  multani_mitti: {
    key: 'multani_mitti',
    rootNames: ['multani mitti', 'fullers earth', 'bentonite clay', 'indian healing clay'],
    scientificName: ['solum fullonum'],
    ayurvedicNames: ['gopi chandan', 'mitti'],
    englishNames: ['fullers earth powder', 'healing clay pack'],
    originRegions: ['Rajasthan', 'Barmer', 'Bikaner'],
    standardForms: ['powder', 'clay chunks'],
    primaryBenefits: ['excess oil absorption', 'deep pore detox', 'skin cooling and soothing'],
    primaryUseCases: ['oil control face pack', 'scalp clarifying pack', 'cooling body mud'],
    semanticThemes: ['mineral clay skincare', 'deep pore cleanser', 'traditional indian face pack'],
    primaryScope: 'SKIN',
    suggestedCategorySlug: 'face-care',
    suggestedGuideSlugs: [],
  },
  methi: {
    key: 'methi',
    rootNames: ['methi', 'fenugreek', 'methi dana', 'menthulu', 'vendhayam'],
    scientificName: ['trigonella foenum-graecum'],
    ayurvedicNames: ['methika'],
    englishNames: ['fenugreek seed powder', 'methi hair pack'],
    originRegions: ['Rajasthan', 'Nagaur', 'Gujarat'],
    standardForms: ['powder', 'whole seeds'],
    primaryBenefits: ['mucilage hair slip', 'hair detangling', 'dandruff reduction', 'scalp hydration'],
    primaryUseCases: ['hair conditioning pack', 'diy hair gel mask', 'scalp soak'],
    semanticThemes: ['natural mucilage conditioner', 'ayurvedic hair slip', 'frizz reducer'],
    primaryScope: 'HAIR',
    suggestedCategorySlug: 'hair-care',
    suggestedGuideSlugs: [],
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
/**
 * Master Universal Auto-SEO Engine
 * Deterministically derives complete SEO metadata, keywords, titles, descriptions, and schemas
 * for ANY current or future botanical/cosmetic product without hallucinating or making external API calls.
 */
import { AutoSeoResult, SeoCompletenessStatus } from './types';

export function deriveProductAutoSeo(product: Partial<Product>): AutoSeoResult {
  const name = (product.name || '').trim();
  const slug = (product.slug || '').trim() || normalizeKeywordTerm(name).replace(/\s+/g, '-');
  const cleanSlug = slug || 'product';
  const categoryName = (product.categoryName || '').trim();
  const rawDesc = (product.shortDescription || product.fullDescription || '').trim();
  const ingredients = product.ingredients || [];
  const benefits = product.benefits || [];
  const productType = product.productType || '';

  // 1. Detect botanical profile or fallback entity
  const botanical = detectBotanicalProfile(product);
  const cleanBaseName = name.replace(/^(musky dose|pure|organic|natural|authentic|sojat|premium)\s+/i, '').trim() || name;

  // 2. Detect Scope & Intent
  let detectedScope: BotanicalScope = botanical?.primaryScope || 'HERBAL';
  const combinedText = `${name} ${categoryName} ${rawDesc} ${ingredients.join(' ')}`.toLowerCase();

  if (combinedText.includes('body art') || combinedText.includes('cone') || combinedText.includes('mehndi artist') || combinedText.includes('bridal')) {
    detectedScope = 'BODY_ART';
  } else if (combinedText.includes('face') || combinedText.includes('skin') || combinedText.includes('toner') || combinedText.includes('glow')) {
    detectedScope = 'SKIN';
  } else if (combinedText.includes('hair') || combinedText.includes('scalp') || combinedText.includes('shampoo') || combinedText.includes('indigo') || combinedText.includes('amla')) {
    detectedScope = 'HAIR';
  } else if (combinedText.includes('wholesale') || combinedText.includes('bulk') || combinedText.includes('kg')) {
    detectedScope = 'WHOLESALE';
  }

  let searchIntent: SearchIntentType = 'COMMERCIAL';
  if (detectedScope === 'WHOLESALE') searchIntent = 'COMMERCIAL';
  else if (detectedScope === 'BODY_ART') searchIntent = 'TRANSACTIONAL';
  else searchIntent = 'COMMERCIAL';

  // 3. Primary Keyword Selection (Strict, Non-Cannibalizing)
  let primaryKeyword = '';
  if (product.seoKeywords && product.seoKeywords.length > 0 && product.seoKeywords[0].trim()) {
    primaryKeyword = normalizeKeywordTerm(product.seoKeywords[0]);
  } else if (botanical) {
    if (botanical.key === 'baq_henna' || combinedText.includes('baq')) {
      primaryKeyword = 'BAQ henna powder';
    } else if (botanical.key === 'indigo') {
      primaryKeyword = 'natural indigo powder for hair';
    } else if (botanical.key === 'henna' && combinedText.includes('triple')) {
      primaryKeyword = 'Sojat pure triple-shifted henna powder';
    } else if (botanical.key === 'rose') {
      primaryKeyword = 'pure damask rose petal powder';
    } else if (botanical.key === 'amla') {
      primaryKeyword = 'pure amla powder for hair';
    } else if (botanical.key === 'hibiscus') {
      primaryKeyword = 'hibiscus flower powder for hair';
    } else if (botanical.key === 'moringa') {
      primaryKeyword = 'moringa leaf powder';
    } else if (botanical.key === 'beetroot') {
      primaryKeyword = 'natural beetroot powder';
    } else if (detectedScope === 'HAIR') {
      primaryKeyword = `${botanical.rootNames[0]} powder for hair`;
    } else if (detectedScope === 'SKIN') {
      primaryKeyword = `${botanical.rootNames[0]} powder for face`;
    } else {
      primaryKeyword = `pure ${botanical.rootNames[0]} powder`;
    }
  } else {
    // Universal unknown botanical derivation
    primaryKeyword = `${cleanBaseName.toLowerCase()}`;
  }

  // 4. Secondary Keywords Generation
  const secondarySet = new Set<string>();
  if (botanical) {
    botanical.englishNames.forEach((en) => secondarySet.add(en.toLowerCase()));
    if (botanical.rootNames.length > 1) {
      secondarySet.add(`${botanical.rootNames[1]} powder`);
    }
    if (detectedScope === 'HAIR') {
      secondarySet.add(`herbal ${botanical.rootNames[0]} hair pack`);
      secondarySet.add(`natural ${botanical.rootNames[0]} for hair`);
    } else if (detectedScope === 'SKIN') {
      secondarySet.add(`natural ${botanical.rootNames[0]} face pack`);
      secondarySet.add(`botanical ${botanical.rootNames[0]} skincare`);
    } else if (detectedScope === 'BODY_ART') {
      secondarySet.add('henna powder for mehndi cones');
      secondarySet.add('body art quality henna powder');
    }
    secondarySet.add(`pure organic ${botanical.rootNames[0]} powder`);
  } else {
    secondarySet.add(`natural ${cleanBaseName.toLowerCase()}`);
    secondarySet.add(`pure ${cleanBaseName.toLowerCase()}`);
    secondarySet.add(`herbal ${cleanBaseName.toLowerCase()}`);
    if (detectedScope === 'HAIR') secondarySet.add(`${cleanBaseName.toLowerCase()} for hair`);
    if (detectedScope === 'SKIN') secondarySet.add(`${cleanBaseName.toLowerCase()} for skin`);
  }

  const secondaryKeywords = Array.from(secondarySet)
    .filter((k) => k !== primaryKeyword && k.length > 3)
    .slice(0, 5);

  // 5. Long-Tail Buyer Candidates
  const longTailSet = new Set<string>();
  if (botanical) {
    if (detectedScope === 'HAIR') {
      longTailSet.add(`chemical free ${botanical.rootNames[0]} hair color in india`);
      longTailSet.add(`pure shade dried ${botanical.rootNames[0]} powder for hair conditioning`);
      longTailSet.add(`ayurvedic ${botanical.rootNames[0]} hair pack with zero additives`);
    } else if (detectedScope === 'SKIN') {
      longTailSet.add(`100 pure ${botanical.rootNames[0]} powder for glowing face pack`);
      longTailSet.add(`chemical free ${botanical.rootNames[0]} powder for pore tightening`);
      longTailSet.add(`shade dried botanical ${botanical.rootNames[0]} facial treatment`);
    } else if (detectedScope === 'BODY_ART') {
      longTailSet.add(`cloth sifted BAQ henna powder for bridal mehndi artists`);
      longTailSet.add(`stringy paste henna powder for smooth clog free cones`);
      longTailSet.add(`high lawsone pure Sojat henna powder for dark stain`);
    }
    longTailSet.add(`authentic ${botanical.rootNames[0]} powder direct from sojat rajasthan`);
  } else {
    longTailSet.add(`100 pure natural ${cleanBaseName.toLowerCase()} from rajasthan`);
    longTailSet.add(`chemical free single ingredient ${cleanBaseName.toLowerCase()}`);
  }
  const longTailKeywords = Array.from(longTailSet).slice(0, 4);

  // 6. Semantic Terms
  const semanticTerms = botanical
    ? [...botanical.semanticThemes, ...botanical.scientificName, ...botanical.originRegions]
    : ['pure botanical', 'single origin rajasthan', 'chemical free herbal care'];

  // 7. Deterministic SEO Title Generation (<= 60 chars, no duplicate brand suffix)
  let seoTitle = product.seoTitle?.trim() || '';
  if (seoTitle) {
    seoTitle = seoTitle.replace(/\s*\|\s*Musky\s*Dose.*$/i, '').trim();
  } else if (name) {
    if (detectedScope === 'HAIR' && !name.toLowerCase().includes('hair')) {
      seoTitle = `${name} — Natural Hair Care & Conditioning`;
    } else if (detectedScope === 'SKIN' && !name.toLowerCase().includes('face') && !name.toLowerCase().includes('skin')) {
      seoTitle = `${name} — Natural Skincare & Face Pack`;
    } else if (detectedScope === 'BODY_ART') {
      seoTitle = `${name} — Body Art Quality Bridal Mehndi`;
    } else {
      seoTitle = `${name} — Pure Botanical Care from Sojat`;
    }
    // Truncate to 60 chars cleanly if needed
    if (seoTitle.length > 60) {
      seoTitle = seoTitle.slice(0, 57).replace(/\s+[^\s]*$/, '') + '...';
    }
  } else {
    seoTitle = 'Botanical Care Product from Sojat';
  }

  // 8. Deterministic Meta Description Generation (140-155 chars)
  let metaDescription = product.seoDescription?.trim() || '';
  if (!metaDescription) {
    if (rawDesc && rawDesc.length >= 60) {
      metaDescription = rawDesc.slice(0, 155).trim();
      if (metaDescription.length < rawDesc.length) {
        metaDescription = metaDescription.replace(/\s+[^\s]*$/, '') + '.';
      }
    } else if (botanical) {
      const origin = botanical.originRegions[0] || 'Sojat, Rajasthan';
      const benefit = botanical.primaryBenefits.slice(0, 2).join(' and ');
      if (detectedScope === 'HAIR') {
        metaDescription = `100% pure ${botanical.rootNames[0]} powder from ${origin}. Natural botanical formulation for ${benefit} with zero synthetic dyes or additives.`;
      } else if (detectedScope === 'SKIN') {
        metaDescription = `100% pure shade-dried ${botanical.rootNames[0]} from ${origin}. Gentle botanical formulation for ${benefit} without artificial fragrance or chemicals.`;
      } else if (detectedScope === 'BODY_ART') {
        metaDescription = `100% Body Art Quality (BAQ) pure ${botanical.rootNames[0]} powder from ${origin}. Micro-cloth sifted for smooth cone paste and rich dark mahogany stain.`;
      } else {
        metaDescription = `100% pure botanical ${botanical.rootNames[0]} harvested in ${origin}. Chemical-free natural herbal powder for traditional Ayurvedic care.`;
      }
    } else {
      metaDescription = `100% natural ${name || 'botanical powder'} harvested in Sojat, Rajasthan. Pure, unadulterated herbal formulation with zero synthetic additives.`;
    }
  }

  // 9. Completeness Status Calculation
  let status: SeoCompletenessStatus = 'SEO_READY';
  let statusMessage = 'SEO fully optimized with high-relevance botanical keywords.';

  if (!name) {
    status = 'SEO_NEEDS_REVIEW';
    statusMessage = 'Product name is missing.';
  } else if (!rawDesc || rawDesc.length < 20) {
    status = 'SEO_NEEDS_DESCRIPTION';
    statusMessage = 'Add a detailed product description for optimal search indexing.';
  } else if (!categoryName && !product.categoryId) {
    status = 'SEO_NEEDS_CATEGORY';
    statusMessage = 'Assign a product category to ensure proper internal linking.';
  }

  return {
    primaryKeyword,
    secondaryKeywords,
    longTailKeywords,
    searchIntent,
    seoTitle,
    metaDescription,
    h1: name || 'Botanical Product',
    semanticTerms,
    canonicalUrl: `https://muskydose.in/products/${cleanSlug}`,
    robotsIndex: product.robotsIndex !== false,
    robotsFollow: product.robotsFollow !== false,
    status,
    statusMessage,
    suggestedCategory: botanical?.suggestedCategorySlug,
    suggestedRelatedGuides: botanical?.suggestedGuideSlugs,
    isAutoGenerated: !product.seoTitle && !product.seoDescription,
  };
}
