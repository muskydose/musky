/**
 * MUSKY DOSE — UNIVERSAL PRODUCT INTELLIGENCE ENGINE V2
 * 
 * Truth-Grounded Product Deconstruction & Taxonomy Normalization
 * 
 * Principles:
 * 1. UNIVERSAL & GENERIC: Functions on existing products, future products, new botanicals, oils, and blends.
 * 2. HENNA_MEHNDI UNIFICATION: All natural spelling variations (henna, mehndi, mehandi, mehendi, heena, hina) map to HENNA_MEHNDI.
 * 3. STRICT BOTANICAL ISOLATION: Entities never inherit unrelated keywords (Indigo never gets Henna terms).
 * 4. CONSERVATIVE FACTUALITY: If confidence is low or entity is unknown, set needsReview = true without guessing.
 * 5. UNIT AWARENESS: Deconstructs pack numbers and units using Global Unit Governance rules.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import { HENNA_MEHNDI_ALIASES } from './seo-demand-engine';

export type ProductType =
  | 'single_botanical'
  | 'herbal_blend'
  | 'essential_oil'
  | 'carrier_oil'
  | 'hydrosol_spray'
  | 'cone'
  | 'paste'
  | 'raw_herb'
  | 'accessory'
  | 'bulk_wholesale'
  | 'generic_product';

export type ProductForm =
  | 'powder'
  | 'oil'
  | 'liquid_spray'
  | 'paste_cone'
  | 'leaves'
  | 'blend_pack'
  | 'solid'
  | 'other';

export type CommercialIntentType = 'RETAIL' | 'B2B_WHOLESALE' | 'HYBRID';
export type LocalIntentType = 'SOJAT_ORIGIN' | 'RAJASTHAN_ORIGIN' | 'PAN_INDIA';
export type IntelligenceConfidence = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW';

export interface UniversalProductIntelligence {
  canonicalProductName: string;
  normalizedProductName: string;
  productType: ProductType;
  entity: string;
  botanicalEntity: string;
  scientificName?: string;
  categorySlug: string;
  categoryName: string;
  form: ProductForm;
  packQuantity: number;
  packUnit: string;
  sellingUnit: string;
  pricingUnit: string;
  wholesaleUnit: string;
  conversionRule: string;
  aliases: string[];
  spellingVariants: string[];
  useCases: string[];
  audienceTypes: string[];
  commercialIntent: CommercialIntentType;
  localIntent: LocalIntentType;
  wholesaleEligible: boolean;
  informationalTopics: string[];
  relatedEntities: string[];
  confidence: IntelligenceConfidence;
  needsReview: boolean;
  reviewReasons: string[];
}

// ------------------------------------------------------------
// 1. KNOWN BOTANICAL DEFINITIONS
// ------------------------------------------------------------
interface BotanicalDefinition {
  id: string;
  canonicalName: string;
  aliases: string[];
  scientificName?: string;
  defaultCategorySlug: string;
  defaultCategoryName: string;
  defaultForm: ProductForm;
  primaryScope: 'HAIR' | 'SKIN' | 'BODY_ART' | 'HERBAL' | 'AROMATHERAPY';
  primaryBenefits: string[];
  primaryUseCases: string[];
  compatibleEntities: string[];
  isSojatTerroir: boolean;
}

export const KNOWN_BOTANICALS: Record<string, BotanicalDefinition> = {
  HENNA_MEHNDI: {
    id: 'HENNA_MEHNDI',
    canonicalName: 'Henna / Mehndi',
    aliases: [
      'henna',
      'mehndi',
      'mehendi',
      'mehandi',
      'heena',
      'hina',
      'lawsonia inermis',
      'madayantika',
    ],
    scientificName: 'Lawsonia Inermis',
    defaultCategorySlug: 'henna',
    defaultCategoryName: 'Henna & Mehndi',
    defaultForm: 'powder',
    primaryScope: 'BODY_ART',
    primaryBenefits: ['Natural reddish-brown plant stain', 'Traditional hair conditioning', 'Cooling scalp sensation', 'Chemical-free herbal care'],
    primaryUseCases: ['Bridal mehndi application', 'Hair conditioning pack', 'Body art paste preparation', 'Natural hair color'],
    compatibleEntities: ['INDIGO', 'AMLA', 'HIBISCUS', 'BEETROOT', 'ROSE'],
    isSojatTerroir: true,
  },
  INDIGO: {
    id: 'INDIGO',
    canonicalName: 'Indigo',
    aliases: ['indigo', 'neel', 'nili', 'avuri', 'neelam', 'indigofera tinctoria'],
    scientificName: 'Indigofera Tinctoria',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Natural blue-black color tone', 'Herbal hair conditioning', 'Chemical-free color formulation'],
    primaryUseCases: ['2-step henna-indigo hair coloring', 'Herbal black hair pack'],
    compatibleEntities: ['HENNA_MEHNDI', 'AMLA', 'BHRINGRAJ'],
    isSojatTerroir: false,
  },
  AMLA: {
    id: 'AMLA',
    canonicalName: 'Amla',
    aliases: ['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'emblica officinalis', 'phyllanthus emblica'],
    scientificName: 'Phyllanthus Emblica',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Traditional hair wash ingredient', 'Herbal hair conditioning', 'Natural botanical profile'],
    primaryUseCases: ['Hair pack preparation', 'DIY hair oil infusion', 'Ayurvedic hair wash blend'],
    compatibleEntities: ['REETHA', 'SHIKAKAI', 'BHRINGRAJ', 'HIBISCUS', 'HENNA_MEHNDI'],
    isSojatTerroir: false,
  },
  REETHA: {
    id: 'REETHA',
    canonicalName: 'Reetha',
    aliases: ['reetha', 'soapnut', 'aritha', 'arishta', 'sapindus mukorossi'],
    scientificName: 'Sapindus Mukorossi',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Natural saponin content for cleansing', 'Gentle hair and scalp wash', 'Soapnut foam alternative'],
    primaryUseCases: ['Natural hair wash', 'DIY herbal shampoo paste'],
    compatibleEntities: ['AMLA', 'SHIKAKAI', 'HIBISCUS'],
    isSojatTerroir: false,
  },
  SHIKAKAI: {
    id: 'SHIKAKAI',
    canonicalName: 'Shikakai',
    aliases: ['shikakai', 'acacia concinna', 'seeyakkai', 'soap pod'],
    scientificName: 'Acacia Concinna',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Traditional herbal hair cleanser', 'Low pH botanical profile', 'Hair softening and conditioning'],
    primaryUseCases: ['Herbal hair wash', 'Ayurvedic cleanser blend'],
    compatibleEntities: ['AMLA', 'REETHA', 'BHRINGRAJ'],
    isSojatTerroir: false,
  },
  HIBISCUS: {
    id: 'HIBISCUS',
    canonicalName: 'Hibiscus',
    aliases: ['hibiscus', 'jaswand', 'gudhal', 'chemparathi', 'hibiscus rosa-sinensis'],
    scientificName: 'Hibiscus Rosa-Sinensis',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Botanical hair conditioning', 'Natural mucilage hydration', 'Hair softening'],
    primaryUseCases: ['Conditioning hair mask', 'Herbal hair oil mixer'],
    compatibleEntities: ['AMLA', 'HENNA_MEHNDI', 'BHRINGRAJ'],
    isSojatTerroir: false,
  },
  BHRINGRAJ: {
    id: 'BHRINGRAJ',
    canonicalName: 'Bhringraj',
    aliases: ['bhringraj', 'eclipta alba', 'eclipta prostrata', 'keshraj', 'false daisy'],
    scientificName: 'Eclipta Prostrata',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Traditional Keshya botanical', 'Herbal scalp pack ingredient', 'Ayurvedic oil formulation'],
    primaryUseCases: ['Hair oil preparation', 'Ayurvedic scalp pack'],
    compatibleEntities: ['AMLA', 'BRAHMI', 'SHIKAKAI'],
    isSojatTerroir: false,
  },
  BRAHMI: {
    id: 'BRAHMI',
    canonicalName: 'Brahmi',
    aliases: ['brahmi', 'bacopa monnieri', 'jalaneem'],
    scientificName: 'Bacopa Monnieri',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['Traditional herbal pack ingredient', 'Cooling scalp sensation', 'Ayurvedic hair care'],
    primaryUseCases: ['Cooling hair pack', 'Herbal oil preparation'],
    compatibleEntities: ['BHRINGRAJ', 'AMLA'],
    isSojatTerroir: false,
  },
  NEEM: {
    id: 'NEEM',
    canonicalName: 'Neem',
    aliases: ['neem', 'azadirachta indica', 'nimba', 'veppilai'],
    scientificName: 'Azadirachta Indica',
    defaultCategorySlug: 'herbal-products',
    defaultCategoryName: 'Herbal & Ayurvedic Care',
    defaultForm: 'powder',
    primaryScope: 'SKIN',
    primaryBenefits: ['Purifying herbal properties', 'Traditional scalp and skin hygiene', 'Botanical cleansing'],
    primaryUseCases: ['Purifying face mask', 'Herbal scalp scrub'],
    compatibleEntities: ['ROSE', 'MULTANI_MITTI', 'AMLA'],
    isSojatTerroir: false,
  },
  MORINGA: {
    id: 'MORINGA',
    canonicalName: 'Moringa',
    aliases: ['moringa', 'moringa oleifera', 'drumstick leaf', 'sahjan', 'murungai'],
    scientificName: 'Moringa Oleifera',
    defaultCategorySlug: 'herbal-products',
    defaultCategoryName: 'Herbal & Ayurvedic Care',
    defaultForm: 'powder',
    primaryScope: 'HERBAL',
    primaryBenefits: ['100% pure Moringa Oleifera leaf powder', 'Traditional botanical preparation', 'Single-ingredient herbal powder'],
    primaryUseCases: ['Botanical face pack mixer', 'Herbal hair pack mixer'],
    compatibleEntities: ['AMLA', 'NEEM'],
    isSojatTerroir: false,
  },
  FENUGREEK: {
    id: 'FENUGREEK',
    canonicalName: 'Fenugreek (Methi)',
    aliases: ['fenugreek', 'methi', 'trigonella foenum-graecum', 'menthulu'],
    scientificName: 'Trigonella Foenum-Graecum',
    defaultCategorySlug: 'hair-care',
    defaultCategoryName: 'Natural Hair Care',
    defaultForm: 'powder',
    primaryScope: 'HAIR',
    primaryBenefits: ['High mucilage botanical profile', 'Natural slip and hydration', 'Traditional herbal paste'],
    primaryUseCases: ['Hydrating hair mask', 'Herbal hair pack'],
    compatibleEntities: ['HENNA_MEHNDI', 'AMLA', 'HIBISCUS'],
    isSojatTerroir: false,
  },
  ROSE: {
    id: 'ROSE',
    canonicalName: 'Rose Petal / Rose Water',
    aliases: ['rose', 'rose petal', 'gulab', 'damask rose', 'rosa damascena', 'rose water', 'gulab jal'],
    scientificName: 'Rosa Damascena',
    defaultCategorySlug: 'face-care',
    defaultCategoryName: 'Natural Face & Skin Care',
    defaultForm: 'liquid_spray',
    primaryScope: 'SKIN',
    primaryBenefits: ['Hydro-distilled floral water', 'Refreshing facial mist', 'Natural skin toner', 'Zero alcohol formulation'],
    primaryUseCases: ['Daily face mist', 'Face pack mixer', 'Skin refresh splash'],
    compatibleEntities: ['HENNA_MEHNDI', 'NEEM', 'BEETROOT'],
    isSojatTerroir: false,
  },
  BEETROOT: {
    id: 'BEETROOT',
    canonicalName: 'Beetroot',
    aliases: ['beetroot', 'beet', 'chukandar', 'beta vulgaris'],
    scientificName: 'Beta Vulgaris',
    defaultCategorySlug: 'face-care',
    defaultCategoryName: 'Natural Face & Skin Care',
    defaultForm: 'powder',
    primaryScope: 'SKIN',
    primaryBenefits: ['Pure natural beetroot powder', 'Natural botanical red pigment', 'DIY cosmetic mixer'],
    primaryUseCases: ['DIY face pack mixer', 'Natural hair tint mixer'],
    compatibleEntities: ['ROSE', 'HENNA_MEHNDI'],
    isSojatTerroir: false,
  },
  ESSENTIAL_OIL: {
    id: 'ESSENTIAL_OIL',
    canonicalName: 'Essential Oil',
    aliases: [
      'essential oil',
      'lavender',
      'tea tree',
      'eucalyptus',
      'rosemary',
      'peppermint',
      'clove',
      'clove oil',
      'nilgiri',
      'aromatherapy',
    ],
    defaultCategorySlug: 'herbal-products',
    defaultCategoryName: 'Herbal & Ayurvedic Care',
    defaultForm: 'oil',
    primaryScope: 'AROMATHERAPY',
    primaryBenefits: ['Aromatic botanical distillate', 'Natural terpene profile for henna paste mixing', 'Aromatherapy diffusion'],
    primaryUseCases: ['Henna paste terpene additive', 'Aromatherapy diffusion', 'Carrier oil dilution for topical use'],
    compatibleEntities: ['HENNA_MEHNDI'],
    isSojatTerroir: false,
  },
};

// ------------------------------------------------------------
// 2. PRODUCT NAME PARSER
// ------------------------------------------------------------
export function parseProductName(rawName: string): {
  normalizedName: string;
  detectedBotanicalKey: string | null;
  form: ProductForm;
  packQuantity: number;
  packUnit: string;
  isB2B: boolean;
  hasSojatSignal: boolean;
  isBlend: boolean;
  isCone: boolean;
  isOil: boolean;
  isLiquidSpray: boolean;
} {
  const norm = (rawName || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Pack extraction regex
  const packMatch = rawName.match(
    /\b(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams|ml|ltr|litre|liter|pieces?|pcs?|cones?|packs?|bottles?|pouches?|jars?|box(?:es)?)\b/i
  );

  let packQuantity = 1;
  let packUnit = 'Piece';

  if (packMatch) {
    packQuantity = parseFloat(packMatch[1]);
    const rawUnit = packMatch[2].toLowerCase();
    if (['kg'].includes(rawUnit)) packUnit = 'kg';
    else if (['g', 'gm', 'gms', 'gram', 'grams'].includes(rawUnit)) packUnit = 'g';
    else if (['ml'].includes(rawUnit)) packUnit = 'ml';
    else if (['ltr', 'litre', 'liter'].includes(rawUnit)) packUnit = 'litre';
    else if (['cone', 'cones'].includes(rawUnit)) packUnit = 'Cone';
    else if (['bottle', 'bottles'].includes(rawUnit)) packUnit = 'Bottle';
    else if (['pouch', 'pouches'].includes(rawUnit)) packUnit = 'Pouch';
    else if (['box', 'boxes'].includes(rawUnit)) packUnit = 'Box';
    else packUnit = 'Piece';
  } else {
    // Check "pack of X"
    const packOfMatch = rawName.match(/pack\s+of\s+(\d+)/i);
    if (packOfMatch) {
      packQuantity = parseInt(packOfMatch[1], 10);
      packUnit = 'Piece';
    }
  }

  // 2. Form & Type signals
  const isCone = /\b(cone|cones)\b/i.test(rawName);
  const isOil = /\b(oil|essential oil|hair oil)\b/i.test(rawName);
  const isLiquidSpray = /\b(spray|mist|water|hydrosol|distillate)\b/i.test(rawName);
  const isBlend = /\b(pack|blend|mix|combo|trio|hair pack|face pack)\b/i.test(rawName) && !isCone;
  const isLeaves = /\b(leaves|leaf|dry leaf)\b/i.test(rawName) && !/\bpowder\b/i.test(rawName);

  let form: ProductForm = 'powder';
  if (isCone) form = 'paste_cone';
  else if (isOil) form = 'oil';
  else if (isLiquidSpray) form = 'liquid_spray';
  else if (isLeaves) form = 'leaves';
  else if (isBlend) form = 'blend_pack';
  else if (/\bpaste\b/i.test(rawName)) form = 'paste_cone';

  // 3. Commercial & Origin signals
  const isB2B = /\b(wholesale|bulk|supplier|manufacturer|b2b|distributor|salon supply|mandi|reseller)\b/i.test(rawName) || packUnit === 'kg' && packQuantity >= 10;
  const hasSojatSignal = /\b(sojat|pali|marwar)\b/i.test(rawName);

  // 4. Botanical Entity resolution
  let detectedBotanicalKey: string | null = null;

  // Strict Henna/Mehndi unification first
  for (const alias of HENNA_MEHNDI_ALIASES) {
    if (norm.includes(alias)) {
      detectedBotanicalKey = 'HENNA_MEHNDI';
      break;
    }
  }

  if (!detectedBotanicalKey) {
    for (const [key, bot] of Object.entries(KNOWN_BOTANICALS)) {
      if (key === 'HENNA_MEHNDI') continue;
      if (bot.aliases.some((a) => norm.includes(a))) {
        detectedBotanicalKey = key;
        break;
      }
    }
  }

  return {
    normalizedName: norm,
    detectedBotanicalKey,
    form,
    packQuantity,
    packUnit,
    isB2B,
    hasSojatSignal,
    isBlend,
    isCone,
    isOil,
    isLiquidSpray,
  };
}

// ------------------------------------------------------------
// 3. UNIVERSAL PRODUCT INTELLIGENCE DERIVATION
// ------------------------------------------------------------
export function deriveProductIntelligence(
  productOrName: string | Partial<Product>,
  allProducts: Product[] = [],
  allCategories: Category[] = []
): UniversalProductIntelligence {
  const rawName = typeof productOrName === 'string' ? productOrName : productOrName.name || 'Botanical Product';
  const parsed = parseProductName(rawName);

  const productObj: Partial<Product> = typeof productOrName === 'string' ? {} : productOrName;
  const knownBot = parsed.detectedBotanicalKey ? KNOWN_BOTANICALS[parsed.detectedBotanicalKey] : null;

  // Product Type Detection
  let productType: ProductType = 'single_botanical';
  if (parsed.isB2B) {
    productType = 'bulk_wholesale';
  } else if (parsed.isCone) {
    productType = 'cone';
  } else if (parsed.isOil) {
    productType = parsed.normalizedName.includes('essential') ? 'essential_oil' : 'carrier_oil';
  } else if (parsed.isLiquidSpray) {
    productType = 'hydrosol_spray';
  } else if (parsed.isBlend) {
    productType = 'herbal_blend';
  } else if (parsed.form === 'leaves') {
    productType = 'raw_herb';
  } else if (!knownBot) {
    productType = 'generic_product';
  }

  // Category resolution
  let categorySlug = productObj.categoryName?.toLowerCase().replace(/\s+/g, '-') || (knownBot?.defaultCategorySlug ?? 'herbal-products');
  let categoryName = productObj.categoryName || (knownBot?.defaultCategoryName ?? 'Herbal & Ayurvedic Care');

  // If known botanical, assign canonical category if not explicitly overridden by admin
  if (knownBot && (!productObj.categoryName || productObj.categoryName === 'Uncategorized')) {
    categorySlug = knownBot.defaultCategorySlug;
    categoryName = knownBot.defaultCategoryName;
  }

  // Unit governance
  const sellingUnit = productObj.sellingUnit || (parsed.packUnit === 'Piece' ? 'Piece' : `${parsed.packQuantity}${parsed.packUnit}`);
  const pricingUnit = productObj.pricingUnit || (['g', 'kg'].includes(parsed.packUnit) ? 'g' : ['ml', 'litre'].includes(parsed.packUnit) ? 'ml' : 'Piece');
  const wholesaleUnit = productObj.wholesaleUnit || (parsed.packUnit === 'kg' ? 'kg' : parsed.packUnit === 'g' ? 'kg' : 'Piece');
  const conversionRule = productObj.conversionRule || `${parsed.packQuantity} ${parsed.packUnit} = 1 ${sellingUnit}`;

  // Confidence & Review reasons
  const reviewReasons: string[] = [];
  let confidence: IntelligenceConfidence = 'HIGH';

  if (!knownBot) {
    confidence = 'NEEDS_REVIEW';
    reviewReasons.push('Unrecognized botanical entity. Please verify botanical categorization and guide scope.');
  }

  if (productType === 'generic_product') {
    confidence = 'NEEDS_REVIEW';
    reviewReasons.push('Generic product type detected.');
  }

  // Local intent signal (Authenticity protection: only if Sojat is genuine for this entity/product)
  let localIntent: LocalIntentType = 'PAN_INDIA';
  if (parsed.hasSojatSignal && (knownBot?.isSojatTerroir || rawName.toLowerCase().includes('sojat'))) {
    localIntent = 'SOJAT_ORIGIN';
  } else if (rawName.toLowerCase().includes('rajasthan')) {
    localIntent = 'RAJASTHAN_ORIGIN';
  }

  // Commercial intent
  const commercialIntent: CommercialIntentType = parsed.isB2B
    ? 'B2B_WHOLESALE'
    : productObj.isWholesaleEligible
    ? 'HYBRID'
    : 'RETAIL';

  // Use cases
  const useCases = knownBot?.primaryUseCases ? [...knownBot.primaryUseCases] : ['Traditional botanical application', 'Personal wellness care'];

  // Audience
  const audienceTypes: string[] = ['Retail Customers', 'DIY Enthusiasts'];
  if (parsed.detectedBotanicalKey === 'HENNA_MEHNDI') {
    audienceTypes.push('Mehndi Artists', 'Bridal Salons', 'Hair Care Enthusiasts');
  }
  if (parsed.isB2B || productObj.isWholesaleEligible) {
    audienceTypes.push('Salons & Spas', 'Wholesale Distributors', 'Private Label Brands');
  }

  // Related entities
  const relatedEntities = knownBot?.compatibleEntities ? [...knownBot.compatibleEntities] : [];

  // Informational topics
  const informationalTopics = [
    `What is ${rawName}?`,
    `How to use ${rawName}`,
    `How to store ${rawName}`,
    `Ingredients and purity`,
  ];
  if (localIntent === 'SOJAT_ORIGIN') {
    informationalTopics.push(`Sojat harvest and origin authentication`);
  }
  if (commercialIntent !== 'RETAIL') {
    informationalTopics.push(`Bulk & wholesale pricing guide`);
  }

  return {
    canonicalProductName: rawName.trim(),
    normalizedProductName: parsed.normalizedName,
    productType,
    entity: parsed.detectedBotanicalKey || 'GENERIC_BOTANICAL',
    botanicalEntity: knownBot?.canonicalName || 'General Botanical',
    scientificName: knownBot?.scientificName,
    categorySlug,
    categoryName,
    form: parsed.form,
    packQuantity: parsed.packQuantity,
    packUnit: parsed.packUnit,
    sellingUnit,
    pricingUnit,
    wholesaleUnit,
    conversionRule,
    aliases: knownBot?.aliases ? [...knownBot.aliases] : [],
    spellingVariants: parsed.detectedBotanicalKey === 'HENNA_MEHNDI' ? Array.from(HENNA_MEHNDI_ALIASES) : [],
    useCases,
    audienceTypes,
    commercialIntent,
    localIntent,
    wholesaleEligible: productObj.isWholesaleEligible !== false && (parsed.isB2B || parsed.packUnit === 'kg' || parsed.detectedBotanicalKey === 'HENNA_MEHNDI'),
    informationalTopics,
    relatedEntities,
    confidence,
    needsReview: confidence === 'NEEDS_REVIEW',
    reviewReasons,
  };
}

// ------------------------------------------------------------
// 4. PRODUCT UPDATE PROPAGATION & GUIDE STALENESS DETECTOR
// ------------------------------------------------------------
export function checkGuideProductStaleness(
  guide: Partial<ProductGuide>,
  currentProduct: Product
): { isStale: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!guide || !currentProduct) {
    return { isStale: false, reasons: [] };
  }

  // 1. Check pack size update
  if (currentProduct.quantityOrWeight) {
    const weightToken = currentProduct.quantityOrWeight.toLowerCase();
    const gIntro = (guide.shortIntro || '').toLowerCase();
    const gPrep = (guide.quantityPreparation || '').toLowerCase();
    if (gPrep && !gPrep.includes(weightToken) && !gIntro.includes(weightToken)) {
      reasons.push(`Product pack weight updated to ${currentProduct.quantityOrWeight}`);
    }
  }

  // 2. Check ingredients mismatch
  if (Array.isArray(currentProduct.ingredients) && currentProduct.ingredients.length > 0) {
    const guideIngs = (guide.ingredients || []).join(' ').toLowerCase();
    const hasMissingIng = currentProduct.ingredients.some(
      (ing) => !guideIngs.includes(ing.toLowerCase())
    );
    if (hasMissingIng) {
      reasons.push('Product ingredient formulation has been modified');
    }
  }

  // 3. Check category mismatch
  if (currentProduct.categoryName && guide.category) {
    if (currentProduct.categoryName.toLowerCase() !== guide.category.toLowerCase()) {
      reasons.push(`Product category changed to ${currentProduct.categoryName}`);
    }
  }

  return {
    isStale: reasons.length > 0,
    reasons,
  };
}
