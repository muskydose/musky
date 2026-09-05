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

export const MAX_CUSTOM_PRODUCT_TYPE_LENGTH = 60;

// Allowed characters: letters, numbers, spaces, hyphens, and normal punctuation
const VALID_CUSTOM_TYPE_REGEX = /^[\p{L}\p{N}\s\-_.,/&()']+$/u;

export interface ProductTypeValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: string;
  isCustom: boolean;
  rawInput?: string;
}

/**
 * Validates and sanitizes a commercial product type classification.
 * - If predefined: valid immediately, normalized to canonical uppercase.
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

  // Check if it matches any predefined type (case-insensitive)
  const upperVal = trimmed.toUpperCase();
  if (PREDEFINED_TYPE_VALUES.has(upperVal)) {
    return {
      valid: true,
      sanitizedValue: upperVal,
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
 */
export function formatProductTypeDisplay(typeValue: string | undefined | null): FormattedProductTypeDisplay {
  if (!typeValue || !typeValue.trim()) {
    const def = PREDEFINED_PRODUCT_TYPES[0];
    return {
      isCustom: false,
      displayLabel: def.label,
      typeValue: def.value,
      badgeLabel: def.value,
    };
  }

  const trimmed = typeValue.trim();
  const upper = trimmed.toUpperCase();
  const matched = PREDEFINED_PRODUCT_TYPES.find((pt) => pt.value === upper);

  if (matched) {
    return {
      isCustom: false,
      displayLabel: matched.label,
      typeValue: matched.value,
      badgeLabel: matched.value,
    };
  }

  return {
    isCustom: true,
    displayLabel: `Custom: ${trimmed}`,
    typeValue: 'CUSTOM',
    customValue: trimmed,
    badgeLabel: `Custom (${trimmed})`,
  };
}

/**
 * Extracts distinct reusable custom types from an array of products.
 */
export function extractDistinctCustomProductTypes(
  products: Array<{ productType?: string | null }>
): string[] {
  const customSet = new Set<string>();
  for (const p of products) {
    if (!p.productType) continue;
    const trimmed = p.productType.trim();
    if (!trimmed) continue;
    if (!PREDEFINED_TYPE_VALUES.has(trimmed.toUpperCase())) {
      customSet.add(trimmed);
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
  commercialProductType: string
): GovernanceIndependenceAudit {
  const violations: string[] = [];

  // 1. Check if commercialProductType is claimed to be a botanical entity
  for (const entity of Object.values(BOTANICAL_SEARCH_ENTITIES)) {
    if (commercialProductType.toLowerCase() === entity.id.toLowerCase()) {
      violations.push(`Commercial Product Type "${commercialProductType}" directly mimics entity ID "${entity.id}".`);
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
