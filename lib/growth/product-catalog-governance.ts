/**
 * MUSKY DOSE — GLOBAL PRODUCT CATALOG GOVERNANCE V1
 * Single Canonical Shared Engine for Product Identity, Pack Size, Unit Families, and Sellable Offers
 *
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. Single Global Rule:
 *    Every product follows: PRODUCT IDENTITY -> PRODUCT TYPE -> BASE PACK -> OPTIONAL VARIANTS -> SELLABLE OFFER -> DOWNSTREAM CHANNELS.
 * 2. Product Type is Commercial Only:
 *    Never dictates botanical entity, Product Scope, BAQ, Organic claims, or B2B qualification.
 * 3. Strict Unit Family Governance:
 *    - OIL & MIST -> VOLUME (ml, Litre; default ml)
 *    - POWDER, RAW, PASTE -> WEIGHT (g, kg; default g)
 *    - FINISHED -> COUNT (cone, Piece, Box, Pack; default cone or Piece)
 *    - CUSTOM -> CONTEXTUAL
 * 4. Deterministic Non-Generic Suggestions:
 *    No generic hardcoded 'g' or 250/500/1000 defaults. Suggestions derive dynamically from Product Type & Base Pack.
 * 5. Single Source of Truth Offer Resolution:
 *    Storefront, Schema, Google Merchant Feed, Cart, and Checkout all consume resolveCanonicalProductOffer(product).
 */

import { Product, ProductVariant, SiteSettings } from '../types';
import { normalizeUnitString, getUnitFamily, UnitFamily } from '../unit-pricing';
import { formatVariantWeight, validateProductVariant } from '../product-variants';
import { normalizeProductType } from './product-type-governance';

export interface UnitFamilyRule {
  family: UnitFamily;
  allowedUnits: string[];
  defaultUnit: string;
  suggestedQuantities: number[];
}

export const PRODUCT_TYPE_UNIT_RULES: Readonly<Record<string, UnitFamilyRule>> = {
  OIL: {
    family: 'volume',
    allowedUnits: ['ml', 'Litre', 'Bottle'],
    defaultUnit: 'ml',
    suggestedQuantities: [30, 50, 100, 200, 500, 1000],
  },
  MIST: {
    family: 'volume',
    allowedUnits: ['ml', 'Litre', 'Bottle'],
    defaultUnit: 'ml',
    suggestedQuantities: [50, 100, 200, 500],
  },
  POWDER: {
    family: 'weight',
    allowedUnits: ['g', 'kg', 'Pouch', 'Jar'],
    defaultUnit: 'g',
    suggestedQuantities: [50, 100, 200, 250, 500, 1000],
  },
  RAW: {
    family: 'weight',
    allowedUnits: ['g', 'kg', 'Pouch', 'Pack'],
    defaultUnit: 'g',
    suggestedQuantities: [100, 250, 500, 1000],
  },
  PASTE: {
    family: 'weight',
    allowedUnits: ['g', 'kg', 'Pouch', 'Jar'],
    defaultUnit: 'g',
    suggestedQuantities: [100, 250, 500, 1000],
  },
  FINISHED: {
    family: 'count',
    allowedUnits: ['cone', 'Piece', 'Box', 'Pack'],
    defaultUnit: 'cone',
    suggestedQuantities: [6, 12, 24, 36, 48, 100],
  },
};

export const UNIT_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  g: 'Grams (g)',
  kg: 'Kilograms (kg)',
  mg: 'Milligrams (mg)',
  ml: 'Millilitres (ml)',
  Litre: 'Litres (Litre)',
  cone: 'Cones (cone)',
  Piece: 'Pieces (Piece)',
  Box: 'Boxes (Box)',
  Pack: 'Packs (Pack)',
  Bottle: 'Bottles (Bottle)',
  Pouch: 'Pouches (Pouch)',
  Jar: 'Jars (Jar)',
};

/**
 * Returns governing unit family rule for a commercial product type.
 */
export function getProductTypeUnitRule(productType: string | undefined | null): UnitFamilyRule {
  const norm = normalizeProductType(productType);
  const typeKey = norm.canonicalType.toUpperCase();
  if (PRODUCT_TYPE_UNIT_RULES[typeKey]) {
    return PRODUCT_TYPE_UNIT_RULES[typeKey];
  }
  // Contextual fallback for custom types
  return {
    family: 'custom',
    allowedUnits: ['g', 'kg', 'ml', 'Litre', 'Piece', 'cone', 'Box', 'Pack', 'Bottle', 'Pouch', 'Jar'],
    defaultUnit: 'g',
    suggestedQuantities: [100, 250, 500],
  };
}

export interface ParsedPackValue {
  quantity: number;
  unit: string;
  display: string;
  family: UnitFamily;
  isRecognized: boolean;
}

/**
 * Deterministically parses legacy and freeform pack strings (e.g. "30ml", "100ml Glass Spray Bottle",
 * "Pack of 12 Cones (approx 30g each)", "250g Pack", "1kg", "12 pieces") without mutating raw values.
 */
export function parseLegacyPackValue(rawStr: string | undefined | null): ParsedPackValue {
  if (!rawStr || !rawStr.trim()) {
    return {
      quantity: 1,
      unit: 'Unit',
      display: 'Standard Pack',
      family: 'custom',
      isRecognized: false,
    };
  }

  const str = rawStr.trim();
  const lower = str.toLowerCase();

  // 1. Cones (e.g. "Pack of 12 Cones", "12 cones")
  const coneMatch = lower.match(/(?:pack\s+of\s+)?(\d+)\s*(?:cones?|mehendi\s*cones?)/);
  if (coneMatch) {
    const qty = parseInt(coneMatch[1], 10);
    return {
      quantity: qty,
      unit: 'cone',
      display: qty === 1 ? '1 Cone' : `${qty} Cones`,
      family: 'count',
      isRecognized: true,
    };
  }

  // 2. Volume (ml, litre)
  const volMatch = lower.match(/(\d+(?:\.\d+)?)\s*(ml|millilitre|milliliter|millilitres|litre|liter|litres|l\b)/);
  if (volMatch) {
    const qty = parseFloat(volMatch[1]);
    const u = volMatch[2].startsWith('l') && !volMatch[2].startsWith('ml') ? 'Litre' : 'ml';
    return {
      quantity: qty,
      unit: u,
      display: u === 'ml' ? `${qty}ml` : `${qty} Litre`,
      family: 'volume',
      isRecognized: true,
    };
  }

  // 3. Weight (g, kg, mg)
  const weightMatch = lower.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|kilograms|g\b|gm|gms|grams?|mg)/);
  if (weightMatch) {
    const qty = parseFloat(weightMatch[1]);
    const u = weightMatch[2].startsWith('k') ? 'kg' : weightMatch[2].startsWith('m') ? 'mg' : 'g';
    return {
      quantity: qty,
      unit: u,
      display: `${qty}${u}`,
      family: 'weight',
      isRecognized: true,
    };
  }

  // 4. Count (pieces, boxes)
  const countMatch = lower.match(/(\d+)\s*(piece|pieces|pcs?|box|boxes|pack|packs)/);
  if (countMatch) {
    const qty = parseInt(countMatch[1], 10);
    const rawU = countMatch[2];
    const u = rawU.startsWith('b') ? 'Box' : rawU.startsWith('pack') ? 'Pack' : 'Piece';
    return {
      quantity: qty,
      unit: u,
      display: `${qty} ${u}${qty > 1 ? 's' : ''}`,
      family: 'count',
      isRecognized: true,
    };
  }

  // 5. Fallback with any leading number
  const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const qty = parseFloat(numMatch[1]);
    return {
      quantity: qty,
      unit: 'Unit',
      display: str,
      family: 'custom',
      isRecognized: false,
    };
  }

  return {
    quantity: 1,
    unit: 'Unit',
    display: str,
    family: 'custom',
    isRecognized: false,
  };
}

/**
 * Deterministically generates suggested next pack size and unit for a new variant.
 * Eliminates all generic hardcoded '250g' defaults.
 */
export function suggestNextVariant(
  productType: string | undefined | null,
  basePackString: string | undefined | null,
  existingVariants: ProductVariant[] = []
): { packQuantity: number; packUnit: string; weight: string } {
  const rule = getProductTypeUnitRule(productType);
  const activeExisting = existingVariants.filter((v) => v.isActive !== false);

  // 1. If variants already exist, suggest from the established variant unit & next larger quantity
  if (activeExisting.length > 0) {
    const lastVar = activeExisting[activeExisting.length - 1];
    const establishedUnit = lastVar.packUnit || rule.defaultUnit;
    const establishedFamily = getUnitFamily(establishedUnit);
    const existingQuantities = activeExisting.map((v) => Number(v.packQuantity)).filter((q) => !isNaN(q));
    const maxQty = existingQuantities.length > 0 ? Math.max(...existingQuantities) : 100;

    // Find next larger quantity from suggestion ladder
    const ladder = rule.suggestedQuantities;
    let nextQty = ladder.find((q) => q > maxQty);
    if (!nextQty) {
      nextQty = maxQty * 2;
    }

    return {
      packQuantity: nextQty,
      packUnit: establishedUnit,
      weight: formatVariantWeight(nextQty, establishedUnit),
    };
  }

  // 2. Derive from existing base pack string if valid
  const parsedBase = parseLegacyPackValue(basePackString);
  if (parsedBase.isRecognized && (rule.family === 'custom' || parsedBase.family === rule.family)) {
    const baseQty = parsedBase.quantity;
    const baseUnit = parsedBase.unit;
    const ladder = rule.suggestedQuantities;
    const nextQty = ladder.find((q) => q > baseQty) || baseQty * 2;

    return {
      packQuantity: nextQty,
      packUnit: baseUnit,
      weight: formatVariantWeight(nextQty, baseUnit),
    };
  }

  // 3. Fallback to product type default
  const defaultQty = rule.suggestedQuantities[0] || 100;
  return {
    packQuantity: defaultQty,
    packUnit: rule.defaultUnit,
    weight: formatVariantWeight(defaultQty, rule.defaultUnit),
  };
}

export interface CatalogVariantValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedVariants: ProductVariant[];
}

/**
 * Validates a list of variants against Product Type unit family governance:
 * - Reject incompatible cross-family combinations (e.g. OIL with grams).
 * - Enforce exactly one default variant among active variants.
 * - Enforce unique IDs and unique SKUs.
 */
export function validateCatalogVariants(
  variants: any[],
  productType: string | undefined | null
): CatalogVariantValidationResult {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { valid: true, errors: [], sanitizedVariants: [] };
  }

  const rule = getProductTypeUnitRule(productType);
  const errors: string[] = [];
  const sanitized: ProductVariant[] = [];
  let establishedFamily: UnitFamily | null = null;

  for (let i = 0; i < variants.length; i++) {
    const raw = variants[i];
    const itemValidation = validateProductVariant(raw, sanitized);
    if (!itemValidation.valid || !itemValidation.normalized) {
      errors.push(`Variant #${i + 1}: ${itemValidation.error || 'Invalid variant'}`);
      continue;
    }

    const norm = itemValidation.normalized;
    const vFamily = getUnitFamily(norm.packUnit || '');

    // Enforce unit family compatibility with Product Type
    if (rule.family !== 'custom' && vFamily !== rule.family) {
      errors.push(
        `Variant #${i + 1} (${norm.weight}): Unit "${norm.packUnit}" (${vFamily}) is incompatible with Product Type "${productType}" which requires ${rule.family} units (${rule.allowedUnits.join(', ')}).`
      );
      continue;
    }

    // Enforce single active unit family within the product's variants
    if (establishedFamily === null) {
      establishedFamily = vFamily;
    } else if (establishedFamily !== vFamily) {
      errors.push(
        `Variant #${i + 1} (${norm.weight}): Cannot mix unit family "${vFamily}" with existing variant family "${establishedFamily}".`
      );
      continue;
    }

    sanitized.push(norm);
  }

  // Ensure exactly one default among active variants
  const activeVariants = sanitized.filter((v) => v.isActive !== false);
  if (activeVariants.length > 0) {
    const defaultCount = activeVariants.filter((v) => v.isDefault).length;
    if (defaultCount === 0) {
      // Choose first active as default
      activeVariants[0].isDefault = true;
    } else if (defaultCount > 1) {
      // Keep only the first marked default
      let foundFirst = false;
      for (const v of activeVariants) {
        if (v.isDefault) {
          if (!foundFirst) {
            foundFirst = true;
          } else {
            v.isDefault = false;
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedVariants: sanitized,
  };
}

/**
 * Filters a product's variants at runtime to return ONLY valid active variants that match
 * the product type unit family. Quarantines corrupted cross-family variants safely without mutating DB.
 */
export function filterValidActiveVariants(product: Partial<Product>): ProductVariant[] {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return [];
  }

  const rule = getProductTypeUnitRule(product.productType);

  const valid = product.variants.filter((v) => {
    if (!v || v.isActive === false) return false;
    const vFamily = getUnitFamily(v.packUnit || (v as any).unit || '');
    if (rule.family !== 'custom' && vFamily !== rule.family) {
      // Quarantined! (e.g. 250g on Bridal Henna Oil)
      return false;
    }
    return true;
  });

  return valid.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export interface CanonicalProductOffer {
  price: number;
  compareAtPrice?: number;
  sku: string;
  displayWeight: string;
  packQuantity?: number;
  packUnit?: string;
  hasVariants: boolean;
  activeVariants: ProductVariant[];
  defaultVariant: ProductVariant | null;
}

/**
 * Single Authoritative Offer Resolver:
 * - If valid active variants exist: primary default variant is authoritative for price, weight, SKU.
 * - If no valid variants exist: root product is authoritative.
 * Consumed identically by Storefront, Product Cards, Google Merchant Feed, Schema, Cart, and Checkout.
 */
export function resolveCanonicalProductOffer(product: Partial<Product>): CanonicalProductOffer {
  const activeVariants = filterValidActiveVariants(product);

  if (activeVariants.length > 0) {
    const defaultVar = activeVariants.find((v) => v.isDefault) || activeVariants[0];
    return {
      price: defaultVar.price,
      compareAtPrice: defaultVar.compareAtPrice,
      sku: defaultVar.sku || product.sku || product.id || '',
      displayWeight: defaultVar.weight,
      packQuantity: defaultVar.packQuantity,
      packUnit: defaultVar.packUnit,
      hasVariants: true,
      activeVariants,
      defaultVariant: defaultVar,
    };
  }

  const fallbackPrice = Number(product.price) || 0;
  const parsed = parseLegacyPackValue(product.quantityOrWeight);

  return {
    price: fallbackPrice,
    compareAtPrice: product.compareAtPrice,
    sku: product.sku || product.id || '',
    displayWeight: product.quantityOrWeight || parsed.display || 'Standard Pack',
    packQuantity: product.packQuantity ?? (parsed.isRecognized ? parsed.quantity : undefined),
    packUnit: product.packUnit ?? (parsed.isRecognized ? parsed.unit : undefined),
    hasVariants: false,
    activeVariants: [],
    defaultVariant: null,
  };
}

/**
 * Formats a clean, standard pack display label for Admin Product Lists and Badges:
 * - No variants: e.g. "30 ml" or "250g Pack"
 * - Variants: e.g. "30 ml (3 sizes)"
 */
export function formatProductPackDisplay(product: Partial<Product>): string {
  const offer = resolveCanonicalProductOffer(product);
  if (offer.hasVariants && offer.activeVariants.length > 1) {
    return `${offer.displayWeight} (${offer.activeVariants.length} sizes)`;
  }
  return offer.displayWeight;
}

export type CatalogAuditSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CatalogItemAudit {
  productId: string;
  productName: string;
  productType: string;
  unitFamily: UnitFamily;
  basePack: string;
  hasVariants: boolean;
  variantCount: number;
  activeVariantCount: number;
  defaultVariantWeight?: string;
  mismatches: string[];
  severity: CatalogAuditSeverity;
}

/**
 * Audits an individual product record against catalog governance rules.
 */
export function auditProductCatalogItem(product: Partial<Product>): CatalogItemAudit {
  const rule = getProductTypeUnitRule(product.productType);
  const mismatches: string[] = [];
  let severity: CatalogAuditSeverity = 'NONE';

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const activeVariants = rawVariants.filter((v) => v && v.isActive !== false);

  // Check cross-family variant contamination
  for (const v of rawVariants) {
    const vFamily = getUnitFamily(v.packUnit || (v as any).unit || '');
    if (rule.family !== 'custom' && vFamily !== rule.family) {
      mismatches.push(
        `Variant "${v.weight || v.sku}" unit "${v.packUnit}" (${vFamily}) violates parent Product Type "${product.productType}" (${rule.family}).`
      );
      severity = 'CRITICAL';
    }
  }

  // Check base pack conflict with variants
  if (activeVariants.length > 0) {
    const parsedBase = parseLegacyPackValue(product.quantityOrWeight);
    const varUnits = new Set(activeVariants.map((v) => getUnitFamily(v.packUnit || '')));
    if (parsedBase.isRecognized && rule.family !== 'custom' && parsedBase.family !== rule.family) {
      mismatches.push(
        `Root quantity "${product.quantityOrWeight}" (${parsedBase.family}) conflicts with Product Type (${rule.family}).`
      );
      if (severity !== 'CRITICAL') severity = 'HIGH';
    }
  }

  // Check multiple defaults
  const defaultCount = activeVariants.filter((v) => v.isDefault).length;
  if (activeVariants.length > 1 && defaultCount > 1) {
    mismatches.push(`Product has ${defaultCount} default variants marked. Exactly one default is allowed.`);
    if (severity === 'NONE') severity = 'MEDIUM';
  }

  const offer = resolveCanonicalProductOffer(product);

  return {
    productId: product.id || 'unknown',
    productName: product.name || 'Untitled Product',
    productType: product.productType || 'POWDER',
    unitFamily: rule.family,
    basePack: product.quantityOrWeight || 'Unspecified',
    hasVariants: offer.hasVariants,
    variantCount: rawVariants.length,
    activeVariantCount: activeVariants.length,
    defaultVariantWeight: offer.defaultVariant?.weight,
    mismatches,
    severity,
  };
}

/**
 * Synchronizes a product's root commercial fields with its primary default variant.
 */
export function synchronizeProductRootWithDefaultVariant(product: Product): Product {
  const offer = resolveCanonicalProductOffer(product);
  if (!offer.hasVariants || !offer.defaultVariant) {
    return product;
  }

  return {
    ...product,
    price: offer.defaultVariant.price,
    compareAtPrice: offer.defaultVariant.compareAtPrice ?? product.compareAtPrice,
    quantityOrWeight: offer.defaultVariant.weight,
    sku: product.sku || offer.defaultVariant.sku,
  };
}

/**
 * Centralized Homepage Product Reference Resolver:
 * Enforces authoritative database state across homepage merchandising:
 * 1. Only products present in activeProducts (verified existing and active in DB) can ever be returned.
 * 2. Merchandised references to deleted or inactive products are strictly ignored/pruned.
 * 3. Never falls back to deleted or unverified products.
 * 4. Data-driven: zero hardcoded product IDs.
 */
export function resolveAuthoritativeHomepageProducts(
  activeProducts: Product[],
  siteSettings: Partial<SiteSettings>
): Product[] {
  if (!activeProducts || activeProducts.length === 0) {
    return [];
  }

  const activeMap = new Map<string, Product>(
    activeProducts.filter((p) => p && p.isActive !== false).map((p) => [p.id, p])
  );

  if (activeMap.size === 0) {
    return [];
  }

  // 1. Check siteSettings.homepageProducts merchandising configuration
  if (Array.isArray(siteSettings.homepageProducts) && siteSettings.homepageProducts.length > 0) {
    const configuredList: Product[] = [];

    // Sort config by sortOrder
    const sortedConfig = [...siteSettings.homepageProducts]
      .filter((c) => c && c.enabled !== false && activeMap.has(c.id))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

    for (const c of sortedConfig) {
      const prod = activeMap.get(c.id);
      if (prod && !configuredList.some((p) => p.id === prod.id)) {
        configuredList.push(prod);
      }
    }

    if (configuredList.length > 0) {
      return configuredList;
    }
  }

  // 2. Fallback: featured / best-seller active products
  const featured = activeProducts
    .filter((p) => p.isActive !== false && (p.isFeatured || (p as any).isBestSeller))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (featured.length > 0) {
    return featured;
  }

  // 3. Fallback: first 6 active products
  return activeProducts
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .slice(0, 6);
}

/**
 * Resolves and sanitizes products for a specific homepage section (e.g. bestsellers or custom section).
 * Only references pointing to currently active products are accepted.
 */
export function resolveAuthoritativeSectionProducts(
  activeProducts: Product[],
  section: { selectedProductIds?: string[]; itemLimit?: number },
  defaultProducts: Product[] = []
): Product[] {
  if (!activeProducts || activeProducts.length === 0) {
    return [];
  }

  const activeMap = new Map<string, Product>(
    activeProducts.filter((p) => p && p.isActive !== false).map((p) => [p.id, p])
  );

  if (activeMap.size === 0) {
    return [];
  }

  let selected: Product[] = [];
  if (Array.isArray(section.selectedProductIds) && section.selectedProductIds.length > 0) {
    for (const id of section.selectedProductIds) {
      const prod = activeMap.get(id);
      if (prod && !selected.some((p) => p.id === prod.id)) {
        selected.push(prod);
      }
    }
  }

  if (selected.length === 0) {
    selected = defaultProducts.filter((p) => p && activeMap.has(p.id));
  }

  const limit = section.itemLimit || 8;
  return selected.slice(0, limit);
}
