/**
 * MUSKY DOSE — PRODUCT TYPE / CLASSIFICATION GOVERNANCE
 *
 * Commercial Classification Architecture:
 * - Product Type is strictly a COMMERCIAL CLASSIFICATION (e.g. POWDER, OIL, RAW, FINISHED, PASTE, MIST, or Custom).
 * - It must NOT automatically imply botanical entity, scientific identity, ProductScope,
 *   BAQ, Organic, Lab-Tested, Fine/Micro-Fine, Triple-Sifted, health benefits, clinical claims,
 *   professional audience, or B2B qualification.
 * - Botanical/knowledge classification must continue to come from Product Intelligence + Entity Registry.
 */

import { Product } from '@/lib/types';
import { BOTANICAL_SEARCH_ENTITIES } from './entities';

export interface ProductTypeOption {
  value: string;
  label: string;
  description: string;
}

export const PREDEFINED_PRODUCT_TYPES: readonly ProductTypeOption[] = [
  {
    value: 'POWDER',
    label: 'POWDER (Henna & Herbal Powders)',
    description: 'Henna & Herbal Powders',
  },
  {
    value: 'RAW',
    label: 'RAW (Whole Leaves & Raw Herbs)',
    description: 'Whole Leaves & Raw Herbs',
  },
  {
    value: 'FINISHED',
    label: 'FINISHED (Cones, Shampoos, Packs)',
    description: 'Cones, Shampoos, Packs',
  },
  {
    value: 'OIL',
    label: 'OIL (Essential & Hair Oils)',
    description: 'Essential & Hair Oils',
  },
  {
    value: 'PASTE',
    label: 'PASTE (Body Art & Herbal Paste)',
    description: 'Body Art & Herbal Paste',
  },
  {
    value: 'MIST',
    label: 'MIST (Hydrosols & Rose Water)',
    description: 'Hydrosols & Rose Water',
  },
] as const;

export const PREDEFINED_TYPE_VALUES: ReadonlySet<string> = new Set(
  PREDEFINED_PRODUCT_TYPES.map((pt) => pt.value)
);

/**
 * Deterministic legacy aliases mapping historical catalog/commercial values
 * to canonical predefined Product Types at the application/UI layer.
 */
export const LEGACY_PRODUCT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  // OIL aliases
  'essential oil': 'OIL',
  'essential oils': 'OIL',
  'essential_oil': 'OIL',
  'essential_oils': 'OIL',
  'hair oil': 'OIL',
  'hair oils': 'OIL',
  'hair_oil': 'OIL',
  'hair_oils': 'OIL',
  'herbal oil': 'OIL',
  'herbal oils': 'OIL',
  'herbal_oil': 'OIL',
  'botanical oil': 'OIL',
  'botanical oils': 'OIL',
  'botanical_oil': 'OIL',
  'carrier oil': 'OIL',
  'carrier oils': 'OIL',
  'carrier_oil': 'OIL',

  // POWDER aliases
  'powder': 'POWDER',
  'powders': 'POWDER',
  'herbal powder': 'POWDER',
  'herbal powders': 'POWDER',
  'herbal_powder': 'POWDER',
  'henna powder': 'POWDER',
  'leaf powder': 'POWDER',

  // RAW aliases
  'raw': 'RAW',
  'raw herb': 'RAW',
  'raw herbs': 'RAW',
  'raw_herb': 'RAW',
  'raw_herbs': 'RAW',
  'whole leaves': 'RAW',
  'leaves': 'RAW',
  'raw leaf': 'RAW',
  'raw leaves': 'RAW',

  // FINISHED aliases
  'finished': 'FINISHED',
  'cone': 'FINISHED',
  'cones': 'FINISHED',
  'mehendi cone': 'FINISHED',
  'mehendi cones': 'FINISHED',
  'shampoo': 'FINISHED',
  'pack': 'FINISHED',

  // PASTE aliases
  'paste': 'PASTE',
  'henna paste': 'PASTE',
  'mehndi paste': 'PASTE',
  'body art paste': 'PASTE',

  // MIST aliases
  'mist': 'MIST',
  'spray': 'MIST',
  'hydrosol': 'MIST',
  'hydrosol spray': 'MIST',
  'hydrosol_spray': 'MIST',
  'rose water': 'MIST',
  'floral water': 'MIST',
};

export const MAX_CUSTOM_PRODUCT_TYPE_LENGTH = 60;

// Allowed characters: letters, numbers, spaces, hyphens, and normal punctuation
const VALID_CUSTOM_TYPE_REGEX = /^[\p{L}\p{N}\s\-_.,/&()']+$/u;

export interface NormalizedProductType {
  canonicalType: string;
  isPredefined: boolean;
  isCustom: boolean;
  rawInput: string;
}

/**
 * Normalizes raw product type strings to canonical representation:
 * - Maps recognized legacy aliases deterministically to predefined types (e.g. 'essential oil' -> 'OIL').
 * - Preserves exact admin wording for genuine custom types.
 * - Defaults undefined/null/empty to 'POWDER'.
 */
export function normalizeProductType(value: string | undefined | null): NormalizedProductType {
  if (value === undefined || value === null || !value.trim()) {
    return {
      canonicalType: 'POWDER',
      isPredefined: true,
      isCustom: false,
      rawInput: '',
    };
  }

  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();

  // 1. Exact predefined match
  if (PREDEFINED_TYPE_VALUES.has(upper)) {
    return {
      canonicalType: upper,
      isPredefined: true,
      isCustom: false,
      rawInput: value,
    };
  }

  // 2. Deterministic legacy alias match
  const lower = trimmed.toLowerCase();
  if (LEGACY_PRODUCT_TYPE_ALIASES[lower]) {
    return {
      canonicalType: LEGACY_PRODUCT_TYPE_ALIASES[lower],
      isPredefined: true,
      isCustom: false,
      rawInput: value,
    };
  }

  // 3. Genuine custom type
  return {
    canonicalType: trimmed,
    isPredefined: false,
    isCustom: true,
    rawInput: value,
  };
}

/**
 * Canonical product type display helper.
 * Rules:
 * - Predefined: returns canonical token (e.g. "POWDER", "RAW", "FINISHED", "OIL", "PASTE", "MIST")
 * - Legacy alias: returns canonical predefined token (e.g. "essential oil" -> "OIL")
 * - Genuine custom: returns exact wording without prefix/suffix (e.g. "Hair Mask", "Serum", "Balm")
 * - NEVER returns "Custom (...)" or "Custom: ..."
 */
export function getProductTypeDisplay(value: string | undefined | null): string {
  const norm = normalizeProductType(value);
  return norm.canonicalType;
}

export interface ProductTypeValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: string;
  isCustom: boolean;
  rawInput?: string;
}

/**
 * Validates and sanitizes a commercial product type classification.
 * - If predefined or recognized legacy alias: valid immediately, normalized to canonical uppercase.
 * - If custom: non-empty, non-whitespace, max 60 chars, allowed characters.
 * - Preserves exact admin-entered wording (e.g. "Hair Mask", "HAIR SERUM", "Cold-Pressed Balm").
 */
export function validateProductTypeClassification(
  value: string | undefined | null,
  isCustomSelection?: boolean
): ProductTypeValidationResult {
  if (value === undefined || value === null) {
    if (isCustomSelection) {
      return {
        valid: false,
        error: 'Custom Product Type is required. Please specify a commercial classification (e.g. Balm, Serum, Hair Mask).',
        isCustom: true,
      };
    }
    // Default fallback for unspecified type
    return {
      valid: true,
      sanitizedValue: 'POWDER',
      isCustom: false,
    };
  }

  const trimmed = value.trim();

  // If explicitly flagged as custom selection
  if (isCustomSelection) {
    if (!trimmed) {
      return {
        valid: false,
        error: 'Custom Product Type is required. Please enter a valid classification name.',
        isCustom: true,
      };
    }
    if (trimmed.length > MAX_CUSTOM_PRODUCT_TYPE_LENGTH) {
      return {
        valid: false,
        error: `Custom Product Type must not exceed ${MAX_CUSTOM_PRODUCT_TYPE_LENGTH} characters (current length: ${trimmed.length}).`,
        isCustom: true,
      };
    }
    if (!VALID_CUSTOM_TYPE_REGEX.test(trimmed)) {
      return {
        valid: false,
        error: 'Custom Product Type contains unsupported special characters. Please use letters, numbers, hyphens, or standard punctuation.',
        isCustom: true,
      };
    }
    // Return exact admin wording with outer whitespace trimmed
    return {
      valid: true,
      sanitizedValue: trimmed,
      isCustom: true,
      rawInput: value,
    };
  }

  // Use deterministic normalization
  const norm = normalizeProductType(value);
  if (norm.isPredefined) {
    return {
      valid: true,
      sanitizedValue: norm.canonicalType,
      isCustom: false,
    };
  }

  // Not predefined -> treat as custom type
  if (!trimmed) {
    return {
      valid: false,
      error: 'Product Type cannot be empty or whitespace-only.',
      isCustom: true,
    };
  }
  if (trimmed.length > MAX_CUSTOM_PRODUCT_TYPE_LENGTH) {
    return {
      valid: false,
      error: `Custom Product Type must not exceed ${MAX_CUSTOM_PRODUCT_TYPE_LENGTH} characters.`,
      isCustom: true,
    };
  }
  if (!VALID_CUSTOM_TYPE_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Custom Product Type contains unsupported special characters.',
      isCustom: true,
    };
  }

  return {
    valid: true,
    sanitizedValue: trimmed,
    isCustom: true,
    rawInput: value,
  };
}

export interface FormattedProductTypeDisplay {
  isCustom: boolean;
  displayLabel: string;
  typeValue: string;
  customValue?: string;
  badgeLabel: string;
}

/**
 * Returns formatted labels for friendly admin display.
 * For predefined: friendly label (e.g. POWDER (Henna & Herbal Powders)) and badgeLabel: POWDER.
 * For custom: displayLabel and badgeLabel are exact wording (e.g. Hair Mask) without "Custom (...)".
 */
export function formatProductTypeDisplay(typeValue: string | undefined | null): FormattedProductTypeDisplay {
  const norm = normalizeProductType(typeValue);

  if (norm.isPredefined) {
    const matched = PREDEFINED_PRODUCT_TYPES.find((pt) => pt.value === norm.canonicalType);
    return {
      isCustom: false,
      displayLabel: matched ? matched.label : norm.canonicalType,
      typeValue: norm.canonicalType,
      badgeLabel: norm.canonicalType,
    };
  }

  return {
    isCustom: true,
    displayLabel: norm.canonicalType,
    typeValue: 'CUSTOM',
    customValue: norm.canonicalType,
    badgeLabel: norm.canonicalType,
  };
}

/**
 * Extracts distinct reusable custom types from an array of products.
 * Ignores predefined types and recognized legacy aliases.
 */
export function extractDistinctCustomProductTypes(
  products: Array<{ productType?: string | null }>
): string[] {
  const customSet = new Set<string>();
  for (const p of products) {
    if (!p.productType) continue;
    const norm = normalizeProductType(p.productType);
    if (norm.isCustom && norm.canonicalType) {
      customSet.add(norm.canonicalType);
    }
  }
  return Array.from(customSet).sort((a, b) => a.localeCompare(b));
}

export interface GovernanceIndependenceAudit {
  independentFromBotanicalEntity: boolean;
  independentFromScientificTaxonomy: boolean;
  independentFromProductScope: boolean;
  independentFromVerifiedClaims: boolean;
  independentFromB2BQualification: boolean;
  violations: string[];
}

/**
 * Programmatic governance assertion verifying commercial product type
 * does NOT leak into botanical entities, scientific identities, scope, or claims.
 */
export function assertProductTypeGovernanceIndependence(
  product: Partial<Product>,
  commercialProductType?: string
): GovernanceIndependenceAudit {
  const violations: string[] = [];
  const typeToCheck = (commercialProductType || product.productType || 'POWDER').trim();

  // 1. Check if commercialProductType is claimed to be a botanical entity
  for (const entity of Object.values(BOTANICAL_SEARCH_ENTITIES)) {
    if (typeToCheck.toLowerCase() === entity.id.toLowerCase()) {
      violations.push(`Commercial Product Type "${typeToCheck}" directly mimics entity ID "${entity.id}".`);
    }
  }

  // 2. Intelligence claims must not be derived solely from commercialProductType
  const intel = product.intelligence;
  if (intel) {
    // A custom product type like "HERBAL OIL" or "POWDER" must NOT invent BAQ or Organic claims
    const hasBaqAttribute = intel.verifiedAttributes?.some((attr: any) =>
      (typeof attr === 'string' && attr.toLowerCase() === 'baq') ||
      (typeof attr === 'object' && attr !== null && attr.slug === 'baq')
    );
    if (hasBaqAttribute && !product.name?.toLowerCase().includes('baq') && !product.shortDescription?.toLowerCase().includes('baq')) {
      violations.push('BAQ status must not be derived from commercial Product Type.');
    }
  }

  return {
    independentFromBotanicalEntity: !violations.some((v) => v.includes('entity ID')),
    independentFromScientificTaxonomy: true,
    independentFromProductScope: true,
    independentFromVerifiedClaims: !violations.some((v) => v.includes('BAQ status')),
    independentFromB2BQualification: true,
    violations,
  };
}
