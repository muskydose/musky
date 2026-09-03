/**
 * Central Botanical & Search Entity Taxonomy
 * Single Source of Truth for:
 * 1. Internal Storefront Search & Synonym Expansion
 * 2. Smart Keyword Routing
 * 3. Autonomous Product Keyword Engine & Auto-SEO
 */

import { Product } from '@/lib/types';

export interface SearchEntity {
  id: string;
  canonicalName: string;
  aliases: string[];
  scientificName: string;
  categorySlug: string;
  guideSlugs: string[];
  relatedProductTypes: string[];
  primaryScope: 'HAIR' | 'SKIN' | 'BODY_ART' | 'HERBAL' | 'WHOLESALE';
}

export const BOTANICAL_SEARCH_ENTITIES: Record<string, SearchEntity> = {
  HENNA_MEHNDI: {
    id: 'HENNA_MEHNDI',
    canonicalName: 'Henna',
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
    categorySlug: 'henna',
    guideSlugs: [
      'sojat-henna-powder-complete-guide',
      'which-henna-powder-is-right-for-you',
    ],
    relatedProductTypes: ['powder', 'leaves', 'paste', 'cone', 'oil', 'baq'],
    primaryScope: 'BODY_ART',
  },
  INDIGO: {
    id: 'INDIGO',
    canonicalName: 'Indigo',
    aliases: ['indigo', 'neel', 'nili', 'avuri', 'neelam', 'indigofera tinctoria'],
    scientificName: 'Indigofera Tinctoria',
    categorySlug: 'hair-care',
    guideSlugs: ['sojat-henna-powder-complete-guide'],
    relatedProductTypes: ['powder', 'leaves'],
    primaryScope: 'HAIR',
  },
  AMLA: {
    id: 'AMLA',
    canonicalName: 'Amla',
    aliases: ['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'emblica officinalis', 'phyllanthus emblica'],
    scientificName: 'Phyllanthus Emblica',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder'],
    primaryScope: 'HAIR',
  },
  HIBISCUS: {
    id: 'HIBISCUS',
    canonicalName: 'Hibiscus',
    aliases: ['hibiscus', 'jaswand', 'gudhul', 'chemparathi', 'hibiscus rosa-sinensis'],
    scientificName: 'Hibiscus Rosa-Sinensis',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder', 'leaves'],
    primaryScope: 'HAIR',
  },
  ROSE: {
    id: 'ROSE',
    canonicalName: 'Rose Petal',
    aliases: ['rose', 'rose petal', 'gulab', 'damask rose', 'rosa damascena', 'rose water', 'gulab jal'],
    scientificName: 'Rosa Damascena',
    categorySlug: 'face-care',
    guideSlugs: [],
    relatedProductTypes: ['powder', 'water', 'mist'],
    primaryScope: 'SKIN',
  },
  MORINGA: {
    id: 'MORINGA',
    canonicalName: 'Moringa',
    aliases: ['moringa', 'drumstick tree', 'sahjan', 'murungai', 'moringa oleifera'],
    scientificName: 'Moringa Oleifera',
    categorySlug: 'herbal-products',
    guideSlugs: [],
    relatedProductTypes: ['powder', 'leaves'],
    primaryScope: 'HERBAL',
  },
  BEETROOT: {
    id: 'BEETROOT',
    canonicalName: 'Beetroot',
    aliases: ['beetroot', 'beet', 'chukandar', 'beta vulgaris'],
    scientificName: 'Beta Vulgaris',
    categorySlug: 'face-care',
    guideSlugs: [],
    relatedProductTypes: ['powder'],
    primaryScope: 'SKIN',
  },
  REETHA: {
    id: 'REETHA',
    canonicalName: 'Reetha',
    aliases: ['reetha', 'soapnut', 'aritha', 'arishta', 'sapindus mukorossi'],
    scientificName: 'Sapindus Mukorossi',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder'],
    primaryScope: 'HAIR',
  },
  SHIKAKAI: {
    id: 'SHIKAKAI',
    canonicalName: 'Shikakai',
    aliases: ['shikakai', 'acacia concinna', 'seeyakkai', 'soap pod'],
    scientificName: 'Acacia Concinna',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder'],
    primaryScope: 'HAIR',
  },
  NEEM: {
    id: 'NEEM',
    canonicalName: 'Neem',
    aliases: ['neem', 'azadirachta indica', 'nimba', 'veppilai'],
    scientificName: 'Azadirachta Indica',
    categorySlug: 'herbal-products',
    guideSlugs: [],
    relatedProductTypes: ['powder', 'leaves', 'oil'],
    primaryScope: 'SKIN',
  },
  BRAHMI: {
    id: 'BRAHMI',
    canonicalName: 'Brahmi',
    aliases: ['brahmi', 'bacopa monnieri', 'jalaneem'],
    scientificName: 'Bacopa Monnieri',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder'],
    primaryScope: 'HAIR',
  },
  BHRINGRAJ: {
    id: 'BHRINGRAJ',
    canonicalName: 'Bhringraj',
    aliases: ['bhringraj', 'eclipta alba', 'eclipta prostrata', 'keshraj', 'false daisy'],
    scientificName: 'Eclipta Prostrata',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder', 'oil'],
    primaryScope: 'HAIR',
  },
  FENUGREEK: {
    id: 'FENUGREEK',
    canonicalName: 'Fenugreek',
    aliases: ['fenugreek', 'methi', 'trigonella foenum-graecum', 'menthulu'],
    scientificName: 'Trigonella Foenum-Graecum',
    categorySlug: 'hair-care',
    guideSlugs: [],
    relatedProductTypes: ['powder', 'seeds'],
    primaryScope: 'HAIR',
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
    scientificName: 'Essential Oil',
    categorySlug: 'herbal-products',
    guideSlugs: [],
    relatedProductTypes: ['oil'],
    primaryScope: 'HERBAL',
  },
};

/**
 * Normalizes query string for entity resolution.
 */
export function normalizeEntityString(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a search query to a matching canonical entity if present.
 */
export function resolveEntityFromQuery(rawQuery: string): SearchEntity | null {
  const clean = normalizeEntityString(rawQuery);
  if (!clean) return null;

  const tokens = clean.split(/\s+/).filter(Boolean);

  for (const entity of Object.values(BOTANICAL_SEARCH_ENTITIES)) {
    // Check direct alias match
    if (entity.aliases.some((alias) => clean === alias || clean.includes(alias))) {
      return entity;
    }
    // Check token match
    if (tokens.some((token) => entity.aliases.includes(token))) {
      return entity;
    }
  }

  return null;
}

/**
 * Detects which canonical entity a product belongs to.
 * Prioritizes product name and slug for primary classification.
 */
export function detectProductEntity(product: Partial<Product>): SearchEntity | null {
  const nameSlug = [product.name || '', product.slug || '', product.productType || ''].join(' ').toLowerCase();

  // 1. Check primary product name & slug first
  for (const entity of Object.values(BOTANICAL_SEARCH_ENTITIES)) {
    if (entity.aliases.some((a) => nameSlug.includes(a))) {
      return entity;
    }
  }

  // 2. If no name match, check category, ingredients, and descriptions
  const secondary = [
    product.categoryName || '',
    ...(product.ingredients || []),
    product.shortDescription || '',
  ].join(' ').toLowerCase();

  for (const entity of Object.values(BOTANICAL_SEARCH_ENTITIES)) {
    if (entity.aliases.some((a) => secondary.includes(a))) {
      return entity;
    }
  }

  return null;
}

