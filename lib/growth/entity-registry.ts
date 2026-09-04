/**
 * MUSKY DOSE — CANONICAL ENTITY REGISTRY & KNOWLEDGE GRAPH ENGINE (PHASE 5)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Core Architectural Mandates:
 * 1. SINGLE CANONICAL SOURCE: Single authoritative registry for botanical and controlled product entities.
 * 2. HENNA_MEHNDI CONSOLIDATION: All spelling variations (henna, mehndi, mehendi, heena, hina) map strictly to HENNA_MEHNDI.
 * 3. SCOPE ISOLATION: Effective scope = intersection(entity.supportedScopes, product.selectedScopes).
 * 4. COMPATIBILITY != VERIFICATION: Conceptual attribute compatibility does not grant verification. Verification is owned exclusively by ProductIntelligence.
 * 5. CONTROLLED PRODUCT CLASSES: HERBAL_BLEND, ESSENTIAL_OIL_SINGLE, and CARRIER_OIL are modeled as controlled classes, not single botanical species.
 * 6. UNKNOWN / NEEDS_REVIEW SAFETY: Unrecognized or ambiguous entities are flagged NEEDS_REVIEW with zero fabricated taxonomy or clinical claims.
 * 7. PURE IN-MEMORY KNOWLEDGE GRAPH: Pure deterministic graph links for search, SEO, and guide reasoning without DB mutation.
 */

import { Product } from '@/lib/types';
import {
  ProductScope,
  VerifiedAttributeSlug,
  ProductFamily,
} from './universal-product-contract';
import { GuideFamily } from './guide-opportunity-engine';

export type CanonicalEntityStatus = 'KNOWN' | 'UNKNOWN' | 'NEEDS_REVIEW';
export type EntityConfidence = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW';
export type EntityClass = 'BOTANICAL_SINGLE' | 'CONTROLLED_PRODUCT_CLASS';

export type KnowledgeRelationshipType =
  | 'PRODUCT_OF_ENTITY'
  | 'COMPONENT_OF_BLEND'
  | 'RELATED_ENTITY'
  | 'ALIAS_OF'
  | 'SUPPORTS_SCOPE'
  | 'MENTIONS_ENTITY';

export interface KnowledgeEntityLink {
  sourceType: 'PRODUCT' | 'ENTITY' | 'GUIDE';
  sourceId: string;
  targetEntityKey: string;
  relationshipType: KnowledgeRelationshipType;
  confidence: EntityConfidence;
  governanceStatus: 'CANONICAL' | 'VERIFIED' | 'AUTO_DERIVED' | 'NEEDS_REVIEW';
  notes?: string;
}

export interface CanonicalEntityRecord {
  entityKey: string;
  canonicalName: string;
  scientificName?: string;
  botanicalFamily?: string;
  productFamily: ProductFamily;
  entityClass: EntityClass;
  aliases: string[];
  normalizedAliases: string[];
  supportedScopes: ProductScope[];
  safeUseCases: string[];
  compatibleAttributes: VerifiedAttributeSlug[];
  searchRepresentations: {
    canonical: string;
    naturalAliases: string[];
    scientific?: string;
  };
  guideFamilies: GuideFamily[];
  relatedEntities: string[];
  status: CanonicalEntityStatus;
  confidence: EntityConfidence;
  description: string;
}

/**
 * Normalizes an alias string for deterministic lookup:
 * Lowercase, whitespace collapsed, special punctuation stripped.
 */
export function normalizeEntityTerm(term: string): string {
  if (!term || typeof term !== 'string') return '';
  return term
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------------------
// 1. CENTRAL CANONICAL ENTITY REGISTRY
// ----------------------------------------------------------------------------
export const CANONICAL_ENTITY_REGISTRY: Record<string, CanonicalEntityRecord> = {
  HENNA_MEHNDI: {
    entityKey: 'HENNA_MEHNDI',
    canonicalName: 'Henna / Mehndi',
    scientificName: 'Lawsonia inermis',
    botanicalFamily: 'Lythraceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
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
    normalizedAliases: [
      'henna',
      'mehndi',
      'mehendi',
      'mehandi',
      'heena',
      'hina',
      'lawsonia inermis',
      'madayantika',
    ],
    supportedScopes: ['HAIR', 'BODY_ART'],
    safeUseCases: [
      'Natural reddish-brown hair conditioning and plant tint',
      'Traditional cooling scalp pack',
      'Bridal and festive body art paste application',
    ],
    compatibleAttributes: [
      'pure',
      'baq',
      'fine',
      'micro-fine',
      'triple-sifted',
      'organic',
      'lab-tested',
    ],
    searchRepresentations: {
      canonical: 'Henna',
      naturalAliases: ['Henna', 'Mehndi', 'Mehendi', 'Heena'],
      scientific: 'Lawsonia inermis',
    },
    guideFamilies: [
      'PRODUCT_OVERVIEW',
      'HOW_TO_USE',
      'WHAT_IS_IT',
      'HOW_TO_STORE',
      'BUYING_GUIDE',
      'ORIGIN_GUIDE',
      'COMPARISON_GUIDE',
      'INGREDIENT_GUIDE',
      'FAQ_GUIDE',
    ],
    relatedEntities: ['INDIGO', 'AMLA', 'HIBISCUS', 'BEETROOT', 'ROSE'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Natural Rajasthani Henna leaf powder for traditional hair conditioning, coloring, and intricate bridal mehndi body art.',
  },

  INDIGO: {
    entityKey: 'INDIGO',
    canonicalName: 'Natural Indigo',
    scientificName: 'Indigofera tinctoria',
    botanicalFamily: 'Fabaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['indigo', 'neel', 'nili', 'avuri', 'neelam', 'indigofera tinctoria'],
    normalizedAliases: ['indigo', 'neel', 'nili', 'avuri', 'neelam', 'indigofera tinctoria'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Chemical-free brown to black hair coloring used sequentially with Henna',
      'Natural herbal hair conditioning',
    ],
    compatibleAttributes: [
      'pure',
      'fine',
      'micro-fine',
      'triple-sifted',
      'organic',
      'lab-tested',
    ],
    searchRepresentations: {
      canonical: 'Indigo',
      naturalAliases: ['Indigo', 'Neel', 'Avuri'],
      scientific: 'Indigofera tinctoria',
    },
    guideFamilies: [
      'PRODUCT_OVERVIEW',
      'HOW_TO_USE',
      'WHAT_IS_IT',
      'HOW_TO_STORE',
      'BUYING_GUIDE',
      'COMPARISON_GUIDE',
      'INGREDIENT_GUIDE',
      'FAQ_GUIDE',
    ],
    relatedEntities: ['HENNA_MEHNDI', 'AMLA'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Pure Indigo leaf powder used traditionally with Henna for chemical-free brown-to-black hair coloring.',
  },

  AMLA: {
    entityKey: 'AMLA',
    canonicalName: 'Amla (Indian Gooseberry)',
    scientificName: 'Phyllanthus emblica',
    botanicalFamily: 'Phyllanthaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'nellikai', 'phyllanthus emblica'],
    normalizedAliases: ['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'nellikai', 'phyllanthus emblica'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Scalp nourishment and hair root strength',
      'Herbal conditioning and shine enhancement',
      'Natural clarifying hair pack component',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Amla',
      naturalAliases: ['Amla', 'Amalaki', 'Indian Gooseberry'],
      scientific: 'Phyllanthus emblica',
    },
    guideFamilies: [
      'PRODUCT_OVERVIEW',
      'HOW_TO_USE',
      'WHAT_IS_IT',
      'HOW_TO_STORE',
      'BUYING_GUIDE',
      'INGREDIENT_GUIDE',
      'FAQ_GUIDE',
    ],
    relatedEntities: ['SHIKAKAI', 'REETHA', 'BHRINGRAJ', 'BRAHMI', 'HENNA_MEHNDI'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Vitamin C rich Indian gooseberry fruit powder for scalp nourishment, hair root strength, and conditioning.',
  },

  SHIKAKAI: {
    entityKey: 'SHIKAKAI',
    canonicalName: 'Shikakai',
    scientificName: 'Senegalia rugata',
    botanicalFamily: 'Fabaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['shikakai', 'seekaya', 'senegalia rugata', 'acacia concinna'],
    normalizedAliases: ['shikakai', 'seekaya', 'senegalia rugata', 'acacia concinna'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Gentle herbal hair wash and natural saponin cleansing',
      'Low-pH conditioning without stripping scalp moisture',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Shikakai',
      naturalAliases: ['Shikakai', 'Seekaya'],
      scientific: 'Senegalia rugata',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['AMLA', 'REETHA', 'BHRINGRAJ'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Traditional Ayurvedic pod powder with gentle natural saponins for cleansing without stripping scalp oils.',
  },

  REETHA: {
    entityKey: 'REETHA',
    canonicalName: 'Reetha (Soapnut)',
    scientificName: 'Sapindus mukorossi',
    botanicalFamily: 'Sapindaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['reetha', 'aritha', 'soapnut', 'sapindus mukorossi', 'soap nut'],
    normalizedAliases: ['reetha', 'aritha', 'soapnut', 'sapindus mukorossi', 'soap nut'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Foaming herbal cleansing for scalp and hair',
      'Residue removal in chemical-free hair care regimens',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Reetha',
      naturalAliases: ['Reetha', 'Aritha', 'Soapnut'],
      scientific: 'Sapindus mukorossi',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['AMLA', 'SHIKAKAI'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Natural foaming botanical soapnut powder for traditional herbal hair wash formulations.',
  },

  HIBISCUS: {
    entityKey: 'HIBISCUS',
    canonicalName: 'Hibiscus Petal',
    scientificName: 'Hibiscus rosa-sinensis',
    botanicalFamily: 'Malvaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['hibiscus', 'gudhal', 'jaswand', 'chembarathi', 'javakusuma'],
    normalizedAliases: ['hibiscus', 'gudhal', 'jaswand', 'chembarathi', 'javakusuma'],
    supportedScopes: ['HAIR', 'SKIN'],
    safeUseCases: [
      'Deep moisture conditioning and hair follicle smoothing',
      'Botanical hydration packs for skin and hair',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Hibiscus',
      naturalAliases: ['Hibiscus', 'Gudhal', 'Jaswand'],
      scientific: 'Hibiscus rosa-sinensis',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['AMLA', 'HENNA_MEHNDI', 'ROSE'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Shade-dried red hibiscus petal powder for deep moisture conditioning and hair follicle soothing.',
  },

  BHRINGRAJ: {
    entityKey: 'BHRINGRAJ',
    canonicalName: 'Bhringraj',
    scientificName: 'Eclipta alba',
    botanicalFamily: 'Asteraceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['bhringraj', 'bringaraj', 'kesharaj', 'false daisy', 'eclipta alba'],
    normalizedAliases: ['bhringraj', 'bringaraj', 'kesharaj', 'false daisy', 'eclipta alba'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Traditional Ayurvedic scalp revitalization and root care',
      'Hair oil infusion base and hair pack component',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Bhringraj',
      naturalAliases: ['Bhringraj', 'Bringaraj', 'False Daisy'],
      scientific: 'Eclipta alba',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['BRAHMI', 'AMLA', 'SHIKAKAI'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Traditional Ayurvedic herbal leaf powder revered for hair vitality and scalp revitalization.',
  },

  BRAHMI: {
    entityKey: 'BRAHMI',
    canonicalName: 'Brahmi',
    scientificName: 'Bacopa monnieri',
    botanicalFamily: 'Plantaginaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['brahmi', 'bacopa monnieri', 'water hyssop', 'jalbrahmi'],
    normalizedAliases: ['brahmi', 'bacopa monnieri', 'water hyssop', 'jalbrahmi'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Cooling scalp pack application',
      'Nutrient-rich hair root conditioning and herbal hair mask',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Brahmi',
      naturalAliases: ['Brahmi', 'Bacopa'],
      scientific: 'Bacopa monnieri',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['BHRINGRAJ', 'AMLA'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Classical Ayurvedic calming herb powder for hair follicle care and scalp temperature cooling.',
  },

  NEEM: {
    entityKey: 'NEEM',
    canonicalName: 'Neem Leaf',
    scientificName: 'Azadirachta indica',
    botanicalFamily: 'Meliaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['neem', 'nimba', 'azadirachta indica', 'indian lilac'],
    normalizedAliases: ['neem', 'nimba', 'azadirachta indica', 'indian lilac'],
    supportedScopes: ['HAIR', 'SKIN'],
    safeUseCases: [
      'Scalp hygiene and cooling herbal care',
      'Clarifying face packs for oily or congested skin',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Neem',
      naturalAliases: ['Neem', 'Nimba', 'Indian Lilac'],
      scientific: 'Azadirachta indica',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['MULTANI_MITTI', 'AMLA'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Bitter botanical leaf powder traditionally valued for scalp hygiene and skin clarifying packs.',
  },

  MORINGA: {
    entityKey: 'MORINGA',
    canonicalName: 'Moringa Leaf',
    scientificName: 'Moringa oleifera',
    botanicalFamily: 'Moringaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['moringa', 'sahjan', 'drumstick leaf', 'moringa oleifera'],
    normalizedAliases: ['moringa', 'sahjan', 'drumstick leaf', 'moringa oleifera'],
    supportedScopes: ['HAIR', 'SKIN'],
    safeUseCases: [
      'Nutrient-dense green botanical hair masks',
      'DIY botanical face pack mixing',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Moringa',
      naturalAliases: ['Moringa', 'Drumstick Leaf'],
      scientific: 'Moringa oleifera',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['AMLA', 'NEEM'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Nutrient-dense green leaf powder for DIY botanical masks and enriching hair infusions.',
  },

  ROSE: {
    entityKey: 'ROSE',
    canonicalName: 'Damask Rose',
    scientificName: 'Rosa damascena',
    botanicalFamily: 'Rosaceae',
    productFamily: 'DISTILLATE_HYDROSOL',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['rose', 'gulab', 'damask rose', 'rose water', 'rose petal', 'rosa damascena'],
    normalizedAliases: ['rose', 'gulab', 'damask rose', 'rose water', 'rose petal', 'rosa damascena'],
    supportedScopes: ['SKIN', 'COSMETIC_FORMULATION'],
    safeUseCases: [
      'Gentle facial toning and post-cleansing misting',
      'Liquid mixer for herbal face packs and henna paste preparation',
    ],
    compatibleAttributes: ['pure', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Rose Water',
      naturalAliases: ['Rose Water', 'Damask Rose', 'Gulab Jal'],
      scientific: 'Rosa damascena',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['MULTANI_MITTI', 'BEETROOT', 'HIBISCUS'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Pure aromatic steam-distilled hydrosol and shade-dried petal powder for facial toning and skincare.',
  },

  BEETROOT: {
    entityKey: 'BEETROOT',
    canonicalName: 'Beetroot',
    scientificName: 'Beta vulgaris',
    botanicalFamily: 'Amaranthaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['beetroot', 'chukandar', 'beta vulgaris', 'beet powder'],
    normalizedAliases: ['beetroot', 'chukandar', 'beta vulgaris', 'beet powder'],
    supportedScopes: ['SKIN', 'COSMETIC_FORMULATION'],
    safeUseCases: [
      'Naturally pigmented botanical face masks',
      'DIY cosmetic tinting and gentle skincare formulations',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Beetroot Powder',
      naturalAliases: ['Beetroot', 'Chukandar'],
      scientific: 'Beta vulgaris',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['ROSE', 'MULTANI_MITTI', 'HENNA_MEHNDI'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Naturally pigmented root powder for botanical face glow masks and cosmetic tinting.',
  },

  FENUGREEK: {
    entityKey: 'FENUGREEK',
    canonicalName: 'Fenugreek (Methi)',
    scientificName: 'Trigonella foenum-graecum',
    botanicalFamily: 'Fabaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['methi', 'fenugreek', 'trigonella foenum-graecum'],
    normalizedAliases: ['methi', 'fenugreek', 'trigonella foenum-graecum'],
    supportedScopes: ['HAIR'],
    safeUseCases: [
      'Mucilage slip and deep hydration in herbal hair packs',
      'Scalp moisturization and hair softness enhancement',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Fenugreek',
      naturalAliases: ['Fenugreek', 'Methi'],
      scientific: 'Trigonella foenum-graecum',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['AMLA', 'SHIKAKAI', 'BHRINGRAJ'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Mucilage-rich seed powder for slip, conditioning, and intense hydration in hair packs.',
  },

  MULTANI_MITTI: {
    entityKey: 'MULTANI_MITTI',
    canonicalName: 'Multani Mitti (Fuller\'s Earth)',
    scientificName: 'Solum fullonum',
    botanicalFamily: 'Clay Mineral',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['multani mitti', 'fullers earth', 'bentonite', 'clay'],
    normalizedAliases: ['multani mitti', 'fullers earth', 'bentonite', 'clay'],
    supportedScopes: ['SKIN', 'HAIR'],
    safeUseCases: [
      'Absorption of excess skin sebum and clarifying facial masks',
      'Traditional clarifying scalp wash paste',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'triple-sifted', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Multani Mitti',
      naturalAliases: ['Multani Mitti', 'Fuller\'s Earth'],
      scientific: 'Solum fullonum',
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['ROSE', 'NEEM', 'BEETROOT'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Natural mineral-rich clay for absorbing surface oils, clarifying pores, and scalp cleansing.',
  },

  // --------------------------------------------------------------------------
  // Controlled Product Classes (Not Single Botanical Species)
  // --------------------------------------------------------------------------
  HERBAL_BLEND: {
    entityKey: 'HERBAL_BLEND',
    canonicalName: 'Herbal Blend / Multi-Botanical Pack',
    scientificName: undefined, // Controlled class: no single genus/species
    botanicalFamily: undefined,
    productFamily: 'HERBAL_BLEND',
    entityClass: 'CONTROLLED_PRODUCT_CLASS',
    aliases: ['hair pack', 'herbal pack', 'blend', 'trio', 'mix', 'face pack'],
    normalizedAliases: ['hair pack', 'herbal pack', 'blend', 'trio', 'mix', 'face pack'],
    supportedScopes: ['HAIR', 'HERBAL'],
    safeUseCases: [
      'Synergistic multi-herb cleansing and conditioning',
      'Customized traditional Ayurvedic hair packs',
    ],
    compatibleAttributes: ['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Herbal Hair Pack',
      naturalAliases: ['Hair Pack', 'Herbal Blend', 'Herbal Mix'],
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['AMLA', 'REETHA', 'SHIKAKAI', 'BHRINGRAJ', 'HIBISCUS'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Formulated combination of two or more complementary botanical powders without synthetic detergents.',
  },

  ESSENTIAL_OIL_SINGLE: {
    entityKey: 'ESSENTIAL_OIL_SINGLE',
    canonicalName: 'Pure Essential Oil',
    scientificName: undefined, // Controlled class: depends on specific plant distillate
    botanicalFamily: undefined,
    productFamily: 'ESSENTIAL_OIL',
    entityClass: 'CONTROLLED_PRODUCT_CLASS',
    aliases: ['essential oil', 'aroma oil', 'pure oil', 'distillate oil'],
    normalizedAliases: ['essential oil', 'aroma oil', 'pure oil', 'distillate oil'],
    supportedScopes: ['HAIR', 'AROMATHERAPY', 'COSMETIC_FORMULATION'],
    safeUseCases: [
      'Aromatherapy diffusion',
      'Terpene enrichment for henna body art paste',
      'Carrier-diluted topical massage and wellness',
    ],
    compatibleAttributes: ['pure', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Essential Oil',
      naturalAliases: ['Essential Oil', 'Aroma Oil'],
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['CARRIER_OIL', 'HENNA_MEHNDI'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Concentrated volatile botanical distillate requiring carrier oil dilution before topical application.',
  },

  CARRIER_OIL: {
    entityKey: 'CARRIER_OIL',
    canonicalName: 'Cold-Pressed Carrier Oil',
    scientificName: undefined,
    botanicalFamily: undefined,
    productFamily: 'CARRIER_OIL',
    entityClass: 'CONTROLLED_PRODUCT_CLASS',
    aliases: ['carrier oil', 'cold pressed oil', 'massage oil', 'base oil'],
    normalizedAliases: ['carrier oil', 'cold pressed oil', 'massage oil', 'base oil'],
    supportedScopes: ['HAIR', 'SKIN', 'COSMETIC_FORMULATION'],
    safeUseCases: [
      'Nourishing base for essential oil dilution',
      'Traditional hair and scalp massage',
      'Skin conditioning and moisture barrier care',
    ],
    compatibleAttributes: ['pure', 'organic', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Carrier Oil',
      naturalAliases: ['Carrier Oil', 'Cold Pressed Oil'],
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
    relatedEntities: ['ESSENTIAL_OIL_SINGLE'],
    status: 'KNOWN',
    confidence: 'HIGH',
    description:
      'Mechanically extracted vegetable oil serving as a nourishing base for essential oil dilution.',
  },

  UNKNOWN: {
    entityKey: 'UNKNOWN',
    canonicalName: 'Unclassified / Novel Botanical Entity',
    scientificName: undefined,
    botanicalFamily: undefined,
    productFamily: 'UNKNOWN',
    entityClass: 'CONTROLLED_PRODUCT_CLASS',
    aliases: [],
    normalizedAliases: [],
    supportedScopes: ['HERBAL'],
    safeUseCases: ['Traditional botanical personal care'],
    compatibleAttributes: ['pure', 'lab-tested'],
    searchRepresentations: {
      canonical: 'Botanical Product',
      naturalAliases: [],
    },
    guideFamilies: ['PRODUCT_OVERVIEW', 'HOW_TO_STORE'],
    relatedEntities: [],
    status: 'UNKNOWN',
    confidence: 'NEEDS_REVIEW',
    description:
      'New or unmapped product entity. Commercial name is strictly preserved and public claims are restricted until reviewed.',
  },
};

// ----------------------------------------------------------------------------
// 2. INVERTED ALIAS MAP (Built deterministically at module initialization)
// ----------------------------------------------------------------------------
const INVERTED_ALIAS_MAP = new Map<string, string>();

for (const [key, record] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
  // Map canonical key itself
  INVERTED_ALIAS_MAP.set(normalizeEntityTerm(key), key);
  INVERTED_ALIAS_MAP.set(key.toLowerCase(), key);
  INVERTED_ALIAS_MAP.set(key.toLowerCase().replace(/_/g, ' '), key);
  INVERTED_ALIAS_MAP.set(normalizeEntityTerm(record.canonicalName), key);

  // Map all aliases
  for (const alias of record.aliases) {
    const norm = normalizeEntityTerm(alias);
    if (norm) {
      INVERTED_ALIAS_MAP.set(norm, key);
    }
  }
}

// ----------------------------------------------------------------------------
// 3. DETERMINISTIC ENTITY RESOLVER FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Returns a canonical entity record by key, or null if unmapped.
 */
export function getEntity(entityKey: string): CanonicalEntityRecord | null {
  if (!entityKey) return null;
  const upperKey = entityKey.toUpperCase().trim();
  return CANONICAL_ENTITY_REGISTRY[upperKey] || null;
}

/**
 * Returns all recognized aliases for a canonical entity key.
 */
export function getEntityAliases(entityKey: string): string[] {
  const record = getEntity(entityKey);
  return record ? [...record.aliases] : [];
}

/**
 * Resolves an entity record directly by an alias or name variant.
 */
export function resolveEntityByAlias(alias: string): CanonicalEntityRecord | null {
  if (!alias || typeof alias !== 'string') return null;
  const norm = normalizeEntityTerm(alias);
  if (!norm) return null;

  // Direct inverted map lookup
  const matchedKey = INVERTED_ALIAS_MAP.get(norm);
  if (matchedKey) {
    return CANONICAL_ENTITY_REGISTRY[matchedKey] || null;
  }

  // Strict priority: check HENNA_MEHNDI aliases first to guarantee consolidation
  for (const hAlias of CANONICAL_ENTITY_REGISTRY.HENNA_MEHNDI.normalizedAliases) {
    const regex = new RegExp(`(^|\\s)${hAlias}(\\s|$)`, 'i');
    if (regex.test(norm)) {
      return CANONICAL_ENTITY_REGISTRY.HENNA_MEHNDI;
    }
  }

  // Check other single botanicals
  for (const [key, record] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
    if (key === 'HENNA_MEHNDI' || key === 'UNKNOWN') continue;
    for (const a of record.normalizedAliases) {
      if (a.length < 3) continue; // Skip too-short aliases to prevent false positives
      const regex = new RegExp(`(^|\\s)${a}(\\s|$)`, 'i');
      if (regex.test(norm)) {
        return record;
      }
    }
  }

  return null;
}

export interface EntityResolutionResult {
  entityRecord: CanonicalEntityRecord;
  canonicalEntityId: string;
  entityKey: string;
  resolutionSource:
    | 'EXPLICIT_PRODUCT_INTELLIGENCE'
    | 'CANONICAL_KEY'
    | 'ALIAS_MATCH'
    | 'PARSED_DERIVATION'
    | 'FALLBACK_UNKNOWN';
  confidence: EntityConfidence;
  effectiveScopes: ProductScope[];
  isAmbiguous: boolean;
  reviewReasons: string[];
}

/**
 * Deterministically resolves the canonical entity for a product or raw string.
 * 
 * Strict 5-Step Precedence:
 * 1. Explicit product.intelligence.entityKey
 * 2. Canonical entity ID directly
 * 3. Normalized alias lookup
 * 4. Safe product-intelligence parser derivation
 * 5. UNKNOWN / NEEDS_REVIEW fallback
 */
export function resolveCanonicalEntity(
  productOrName: string | Partial<Product>
): EntityResolutionResult {
  const reviewReasons: string[] = [];

  // Handle Partial<Product>
  if (typeof productOrName === 'object' && productOrName !== null) {
    const product = productOrName;
    const rawName = (product.name || '').trim();

    // 1. Explicit Product Intelligence Metadata (Highest Precedence)
    const intel = product.intelligence;
    if (intel && intel.entityKey) {
      const explicitKey = intel.entityKey.toUpperCase().trim();

      if (explicitKey === 'UNKNOWN') {
        const unknownRecord = CANONICAL_ENTITY_REGISTRY.UNKNOWN;
        const effectiveScopes = getEffectiveScopes('UNKNOWN', intel.scopes);
        return {
          entityRecord: unknownRecord,
          canonicalEntityId: 'UNKNOWN',
          entityKey: 'UNKNOWN',
          resolutionSource: 'EXPLICIT_PRODUCT_INTELLIGENCE',
          confidence: 'NEEDS_REVIEW',
          effectiveScopes,
          isAmbiguous: false,
          reviewReasons: ['Entity explicitly marked as UNKNOWN in Product Intelligence.'],
        };
      }

      const explicitRecord = getEntity(explicitKey);
      if (explicitRecord) {
        const effectiveScopes = getEffectiveScopes(explicitKey, intel.scopes);
        return {
          entityRecord: explicitRecord,
          canonicalEntityId: explicitRecord.entityKey,
          entityKey: explicitRecord.entityKey,
          resolutionSource: 'EXPLICIT_PRODUCT_INTELLIGENCE',
          confidence: intel.status === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'HIGH',
          effectiveScopes,
          isAmbiguous: false,
          reviewReasons: intel.status === 'NEEDS_REVIEW' ? ['Intelligence marked NEEDS_REVIEW'] : [],
        };
      }
    }

    // 2. Canonical key from raw name if name is a direct entity key
    const directKeyRecord = getEntity(rawName);
    if (directKeyRecord) {
      return {
        entityRecord: directKeyRecord,
        canonicalEntityId: directKeyRecord.entityKey,
        entityKey: directKeyRecord.entityKey,
        resolutionSource: 'CANONICAL_KEY',
        confidence: 'HIGH',
        effectiveScopes: [...directKeyRecord.supportedScopes],
        isAmbiguous: false,
        reviewReasons: [],
      };
    }

    // 3. Alias match from rawName
    const matchedByAlias = resolveEntityByAlias(rawName);
    if (matchedByAlias) {
      const effectiveScopes = getEffectiveScopes(matchedByAlias.entityKey, intel?.scopes);
      return {
        entityRecord: matchedByAlias,
        canonicalEntityId: matchedByAlias.entityKey,
        entityKey: matchedByAlias.entityKey,
        resolutionSource: 'ALIAS_MATCH',
        confidence: 'HIGH',
        effectiveScopes,
        isAmbiguous: false,
        reviewReasons: [],
      };
    }

    // 4. Safe product-intelligence parser derivation (category or slug scanning)
    const categoryName = (product as any).categoryName || (product as any).category?.name || '';
    const slug = (product as any).slug || '';
    const textToScan = `${rawName} ${categoryName} ${slug}`.trim();
    const matchedFromScan = resolveEntityByAlias(textToScan);
    if (matchedFromScan) {
      const effectiveScopes = getEffectiveScopes(matchedFromScan.entityKey, intel?.scopes);
      return {
        entityRecord: matchedFromScan,
        canonicalEntityId: matchedFromScan.entityKey,
        entityKey: matchedFromScan.entityKey,
        resolutionSource: 'PARSED_DERIVATION',
        confidence: 'MEDIUM',
        effectiveScopes,
        isAmbiguous: false,
        reviewReasons: [],
      };
    }

    // 5. Ambiguity / Unknown fallback
    const unknownRecord = CANONICAL_ENTITY_REGISTRY.UNKNOWN;
    reviewReasons.push(`Could not deterministically match "${rawName}" to a known canonical entity.`);
    return {
      entityRecord: unknownRecord,
      canonicalEntityId: 'UNKNOWN',
      entityKey: 'UNKNOWN',
      resolutionSource: 'FALLBACK_UNKNOWN',
      confidence: 'NEEDS_REVIEW',
      effectiveScopes: ['HERBAL'],
      isAmbiguous: rawName.length > 0,
      reviewReasons,
    };
  }

  // Handle raw string input
  const strInput = (productOrName || '').trim();

  // 1. Direct key match
  const directRecord = getEntity(strInput);
  if (directRecord) {
    return {
      entityRecord: directRecord,
      canonicalEntityId: directRecord.entityKey,
      entityKey: directRecord.entityKey,
      resolutionSource: 'CANONICAL_KEY',
      confidence: 'HIGH',
      effectiveScopes: [...directRecord.supportedScopes],
      isAmbiguous: false,
      reviewReasons: [],
    };
  }

  // 2. Alias match
  const aliasRecord = resolveEntityByAlias(strInput);
  if (aliasRecord) {
    return {
      entityRecord: aliasRecord,
      canonicalEntityId: aliasRecord.entityKey,
      entityKey: aliasRecord.entityKey,
      resolutionSource: 'ALIAS_MATCH',
      confidence: 'HIGH',
      effectiveScopes: [...aliasRecord.supportedScopes],
      isAmbiguous: false,
      reviewReasons: [],
    };
  }

  // 3. Fallback UNKNOWN
  const unknownRecord = CANONICAL_ENTITY_REGISTRY.UNKNOWN;
  return {
    entityRecord: unknownRecord,
    canonicalEntityId: 'UNKNOWN',
    entityKey: 'UNKNOWN',
    resolutionSource: 'FALLBACK_UNKNOWN',
    confidence: 'NEEDS_REVIEW',
    effectiveScopes: ['HERBAL'],
    isAmbiguous: strInput.length > 0,
    reviewReasons: [`Unrecognized entity string: "${strInput}".`],
  };
}

// ----------------------------------------------------------------------------
// 4. SCOPE GOVERNANCE & EFFECTIVE SCOPE RESOLUTION
// ----------------------------------------------------------------------------

/**
 * Checks if a scope is conceptually supported by an entity.
 */
export function isEntityScopeCompatible(entityKey: string, scope: ProductScope): boolean {
  const record = getEntity(entityKey);
  if (!record) return false;
  return record.supportedScopes.includes(scope);
}

/**
 * Calculates effective scopes:
 * effectiveScope = intersection(entity.supportedScopes, product.selectedScopes).
 * 
 * If productSelectedScopes is omitted or empty, falls back to entity's default supportedScopes.
 * Prevents scope leakage (e.g. hair-only henna product will never activate BODY_ART).
 */
export function getEffectiveScopes(
  entityKey: string,
  productSelectedScopes?: ProductScope[]
): ProductScope[] {
  const record = getEntity(entityKey);
  if (!record) {
    return productSelectedScopes && productSelectedScopes.length > 0
      ? [...productSelectedScopes]
      : ['HERBAL'];
  }

  // If no product scopes selected, default to all supported scopes of the entity
  if (!productSelectedScopes || productSelectedScopes.length === 0) {
    return [...record.supportedScopes];
  }

  // Strict intersection
  const intersection = record.supportedScopes.filter((scope) =>
    productSelectedScopes.includes(scope)
  );

  return intersection;
}

// ----------------------------------------------------------------------------
// 5. ATTRIBUTE COMPATIBILITY GOVERNANCE
// ----------------------------------------------------------------------------

/**
 * Checks if an attribute is conceptually compatible with an entity.
 * 
 * IMPORTANT: Compatibility DOES NOT equal verification!
 * A product only possesses verified attributes if they are explicitly registered
 * in `product.intelligence.verifiedAttributes` with an approved verification source.
 */
export function isAttributeCompatible(
  entityKey: string,
  attributeSlug: string
): boolean {
  const record = getEntity(entityKey);
  if (!record) return false;

  const normSlug = attributeSlug === 'body-art-quality' ? 'baq' : attributeSlug.toLowerCase().trim();
  return record.compatibleAttributes.includes(normSlug as VerifiedAttributeSlug);
}

// ----------------------------------------------------------------------------
// 6. SEARCH REPRESENTATION HELPER
// ----------------------------------------------------------------------------

/**
 * Returns contextual search representations for an entity without keyword stuffing.
 */
export function getSearchRepresentation(
  entityKey: string,
  context: 'CANONICAL' | 'NATURAL' | 'SCIENTIFIC' | 'ALL_NATURAL' = 'CANONICAL'
): { primaryTerm: string; alternateTerms: string[]; scientificTerm?: string } {
  const record = getEntity(entityKey) || CANONICAL_ENTITY_REGISTRY.UNKNOWN;

  let primaryTerm = record.searchRepresentations.canonical;
  let alternateTerms = [...record.searchRepresentations.naturalAliases];

  if (context === 'SCIENTIFIC' && record.scientificName) {
    primaryTerm = record.scientificName;
    alternateTerms = [record.searchRepresentations.canonical, ...record.searchRepresentations.naturalAliases];
  } else if (context === 'NATURAL') {
    primaryTerm = record.searchRepresentations.naturalAliases[0] || record.searchRepresentations.canonical;
    alternateTerms = record.searchRepresentations.naturalAliases.slice(1);
  }

  return {
    primaryTerm,
    alternateTerms,
    scientificTerm: record.scientificName,
  };
}

// ----------------------------------------------------------------------------
// 7. IN-MEMORY KNOWLEDGE GRAPH LINK MODEL
// ----------------------------------------------------------------------------

/**
 * Deterministically constructs in-memory Knowledge Graph entity links for a product.
 * Does NOT write to database.
 */
export function generateProductEntityLinks(
  product: Partial<Product>
): KnowledgeEntityLink[] {
  const links: KnowledgeEntityLink[] = [];
  const productId = product.id || product.slug || 'unknown-product';
  const resolution = resolveCanonicalEntity(product);
  const entityKey = resolution.entityKey;

  // 1. PRODUCT_OF_ENTITY Link
  links.push({
    sourceType: 'PRODUCT',
    sourceId: productId,
    targetEntityKey: entityKey,
    relationshipType: 'PRODUCT_OF_ENTITY',
    confidence: resolution.confidence,
    governanceStatus: resolution.resolutionSource === 'EXPLICIT_PRODUCT_INTELLIGENCE' ? 'VERIFIED' : 'AUTO_DERIVED',
    notes: `Resolved via ${resolution.resolutionSource}`,
  });

  // 2. SUPPORTS_SCOPE Links
  for (const scope of resolution.effectiveScopes) {
    links.push({
      sourceType: 'PRODUCT',
      sourceId: productId,
      targetEntityKey: scope,
      relationshipType: 'SUPPORTS_SCOPE',
      confidence: 'HIGH',
      governanceStatus: 'CANONICAL',
    });
  }

  // 3. COMPONENT_OF_BLEND Links (Strictly explicit declaration only!)
  if (entityKey === 'HERBAL_BLEND') {
    const rawBlendComps = (product as any).intelligence?.blendComponents || (product as any).blendComponents;
    if (Array.isArray(rawBlendComps)) {
      for (const comp of rawBlendComps) {
        const compRecord = getEntity(comp);
        if (compRecord) {
          links.push({
            sourceType: 'PRODUCT',
            sourceId: productId,
            targetEntityKey: compRecord.entityKey,
            relationshipType: 'COMPONENT_OF_BLEND',
            confidence: 'HIGH',
            governanceStatus: 'VERIFIED',
            notes: 'Explicitly declared blend component.',
          });
        }
      }
    }
  }

  // 4. RELATED_ENTITY Links (Related knowledge entities only, NOT ingredients!)
  for (const rel of resolution.entityRecord.relatedEntities) {
    links.push({
      sourceType: 'ENTITY',
      sourceId: entityKey,
      targetEntityKey: rel,
      relationshipType: 'RELATED_ENTITY',
      confidence: 'HIGH',
      governanceStatus: 'CANONICAL',
      notes: 'Related knowledge entity context. Does NOT imply formulation or ingredient inclusion.',
    });
  }

  return links;
}

// ----------------------------------------------------------------------------
// 8. SINGLE AUTHORITATIVE REGISTRY HELPERS (PHASE 6.1)
// ----------------------------------------------------------------------------

/**
 * Returns all public, indexable canonical entity records.
 * Strictly excludes UNKNOWN and any entity with status !== 'KNOWN'.
 */
export function getPublicIndexableEntities(): CanonicalEntityRecord[] {
  return Object.values(CANONICAL_ENTITY_REGISTRY).filter(
    (record) => record.status === 'KNOWN' && record.entityKey !== 'UNKNOWN'
  );
}

/**
 * Single authoritative source for entity counts across public routes, sitemap, and admin diagnostics.
 */
export function getAuthoritativeEntityCounts() {
  const all = Object.values(CANONICAL_ENTITY_REGISTRY);
  const publicIndexable = getPublicIndexableEntities();
  const botanicalSingle = all.filter((r) => r.entityClass === 'BOTANICAL_SINGLE');
  const controlledClasses = all.filter((r) => r.entityClass === 'CONTROLLED_PRODUCT_CLASS');
  const unknown = all.filter((r) => r.entityKey === 'UNKNOWN' || r.status === 'UNKNOWN');
  const needsReview = all.filter((r) => r.confidence === 'NEEDS_REVIEW' || r.status === 'NEEDS_REVIEW');

  return {
    totalEntities: all.length,
    publicIndexableCount: publicIndexable.length,
    botanicalSingleCount: botanicalSingle.length,
    controlledClassCount: controlledClasses.length,
    unknownCount: unknown.length,
    needsReviewCount: needsReview.length,
  };
}
