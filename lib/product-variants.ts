/**
 * MUSKY DOSE — CANONICAL PRODUCT VARIANT ENGINE
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. Arbitrary Admin-Defined Retail Quantities:
 *    Any positive numeric packQuantity (e.g., 50, 100, 175, 225, 350, 500, 750, 1000)
 *    paired with a governed unit from lib/unit-pricing.ts is valid. Never hardcode fixed lists.
 * 2. Strict Separation:
 *    Retail pack variants (consumer sizes on product pages) remain 100% decoupled from
 *    wholesale B2B tiers (bulk rules in kg/Litre/Box via bulk_pricing_rules).
 * 3. Collision-Free Cart Identity:
 *    Cart items are identified by `${productId}::${variantId || 'default'}` so that multiple
 *    pack sizes of the same product coexist seamlessly without overwriting.
 * 4. Backward Compatibility:
 *    Products with variants = [] fallback safely to root product price and quantityOrWeight.
 */

import { Product, ProductVariant } from './types';
import { normalizeUnitString, getUnitFamily, UnitFamily } from './unit-pricing';

export interface VariantValidationResult {
  valid: boolean;
  error?: string;
  normalized?: ProductVariant;
}

export interface VariantListValidationResult {
  valid: boolean;
  errors: string[];
  normalized: ProductVariant[];
}

/**
 * Standardizes variant weight display string from quantity and unit.
 * Examples: (225, 'g') -> '225g', (1, 'kg') -> '1kg', (500, 'ml') -> '500ml', (12, 'cone') -> '12 Cones'
 */
export function formatVariantWeight(packQuantity: number, packUnit: string): string {
  const normUnit = normalizeUnitString(packUnit);
  if (normUnit.toLowerCase() === 'cone') {
    return packQuantity === 1 ? '1 Cone' : `${packQuantity} Cones`;
  }
  if (normUnit.toLowerCase() === 'box') {
    return packQuantity === 1 ? '1 Box' : `${packQuantity} Boxes`;
  }
  if (normUnit.toLowerCase() === 'piece') {
    return packQuantity === 1 ? '1 Piece' : `${packQuantity} Pieces`;
  }
  if (['g', 'kg', 'mg', 'ml'].includes(normUnit.toLowerCase())) {
    return `${packQuantity}${normUnit}`;
  }
  return `${packQuantity} ${normUnit}`;
}

/**
 * Validates a single ProductVariant against canonical unit and pricing governance.
 */
export function validateProductVariant(
  variant: any,
  existingVariants: ProductVariant[] = []
): VariantValidationResult {
  if (!variant || typeof variant !== 'object') {
    return { valid: false, error: 'Variant must be a non-null object' };
  }

  // 1. Pack Quantity Validation
  const rawQty = variant.packQuantity ?? variant.quantity;
  const packQuantity = Number(rawQty);
  if (isNaN(packQuantity) || packQuantity <= 0 || !isFinite(packQuantity)) {
    return {
      valid: false,
      error: `Invalid pack quantity: "${rawQty}". Pack quantity must be a positive finite number greater than 0.`,
    };
  }

  // 2. Unit Validation
  const rawUnit = String(variant.packUnit || variant.unit || '').trim();
  if (!rawUnit) {
    return {
      valid: false,
      error: 'Pack unit is required (e.g. "g", "kg", "ml", "Litre", "Piece", "Box").',
    };
  }

  const packUnit = normalizeUnitString(rawUnit);
  const family = getUnitFamily(packUnit);
  const allowedFamilies: UnitFamily[] = ['weight', 'volume', 'count', 'container'];
  if (!allowedFamilies.includes(family)) {
    return {
      valid: false,
      error: `Governed unit "${rawUnit}" is not in an allowed unit family (weight, volume, count, container).`,
    };
  }

  // 3. Price Validation
  const price = Number(variant.price);
  if (isNaN(price) || price < 0 || !isFinite(price)) {
    return {
      valid: false,
      error: `Variant price must be a non-negative finite number. Received: "${variant.price}".`,
    };
  }

  // 4. Compare At Price Validation (Optional)
  let compareAtPrice: number | undefined = undefined;
  if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null && variant.compareAtPrice !== '') {
    const cmp = Number(variant.compareAtPrice);
    if (isNaN(cmp) || cmp < 0 || !isFinite(cmp)) {
      return {
        valid: false,
        error: `Variant compareAtPrice must be a non-negative number. Received: "${variant.compareAtPrice}".`,
      };
    }
    compareAtPrice = cmp;
  }

  // 5. Stock Status & Quantity
  const validStockStatuses = ['in_stock', 'out_of_stock', 'pre_order'];
  const stockStatus = validStockStatuses.includes(variant.stockStatus)
    ? variant.stockStatus
    : 'in_stock';

  let stockQuantity: number | undefined = undefined;
  if (variant.stockQuantity !== undefined && variant.stockQuantity !== null && variant.stockQuantity !== '') {
    const sq = Number(variant.stockQuantity);
    if (!isNaN(sq) && sq >= 0 && isFinite(sq)) {
      stockQuantity = Math.floor(sq);
    }
  }

  // 6. Identity & SKU
  const id = String(variant.id || '').trim() || `var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sku = String(variant.sku || '').trim() || `SKU-${id.toUpperCase()}`;

  // Duplicate ID Check
  if (existingVariants.some((v) => v.id === id)) {
    return {
      valid: false,
      error: `Duplicate variant ID "${id}" detected. Variant IDs must be unique within a product.`,
    };
  }

  // Duplicate SKU Check (if non-empty)
  if (sku && existingVariants.some((v) => v.sku && v.sku.toLowerCase() === sku.toLowerCase())) {
    return {
      valid: false,
      error: `Duplicate variant SKU "${sku}" detected. Each variant must have a unique SKU.`,
    };
  }

  // Weight formatting
  const weight = variant.weight && typeof variant.weight === 'string' && variant.weight.trim()
    ? variant.weight.trim()
    : formatVariantWeight(packQuantity, packUnit);

  const normalized: ProductVariant = {
    id,
    sku,
    weight,
    price,
    compareAtPrice,
    stockStatus,
    stockQuantity,
    packQuantity,
    packUnit,
    pricingUnit: variant.pricingUnit ? normalizeUnitString(variant.pricingUnit) : packUnit,
    sellingUnit: variant.sellingUnit ? normalizeUnitString(variant.sellingUnit) : 'Pack',
    wholesaleUnit: variant.wholesaleUnit ? normalizeUnitString(variant.wholesaleUnit) : (family === 'weight' ? 'kg' : family === 'volume' ? 'Litre' : 'Box'),
    conversionRule: variant.conversionRule || undefined,
    isWholesaleEligible: Boolean(variant.isWholesaleEligible),
    isActive: variant.isActive !== false,
  };

  return { valid: true, normalized };
}

/**
 * Validates a list of variants for a single product.
 * Enforces:
 * - No duplicate IDs
 * - No duplicate SKUs
 * - Coherent unit families (e.g. powder cannot mix grams and millilitres)
 */
export function validateProductVariants(variants: any[]): VariantListValidationResult {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { valid: true, errors: [], normalized: [] };
  }

  const errors: string[] = [];
  const normalized: ProductVariant[] = [];
  let detectedFamily: UnitFamily | null = null;

  for (let i = 0; i < variants.length; i++) {
    const rawVariant = variants[i];
    const validation = validateProductVariant(rawVariant, normalized);

    if (!validation.valid || !validation.normalized) {
      errors.push(`Variant #${i + 1}: ${validation.error || 'Invalid variant'}`);
      continue;
    }

    const norm = validation.normalized;
    const vFamily = getUnitFamily(norm.packUnit || '');

    // Check for impossible mixed unit families within one product
    if (detectedFamily === null) {
      detectedFamily = vFamily;
    } else if (detectedFamily !== vFamily) {
      errors.push(
        `Variant #${i + 1} (${norm.weight}): Cannot mix unit family "${vFamily}" with established family "${detectedFamily}" within the same product.`
      );
      continue;
    }

    normalized.push(norm);
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

/**
 * Derives a stable, collision-free cart item ID.
 * Product without variant -> `${productId}::default`
 * Product with variant -> `${productId}::${variantId}`
 */
export function getCartItemId(productId: string, variantId?: string | null): string {
  const cleanProd = String(productId || '').trim();
  const cleanVar = String(variantId || '').trim();
  return cleanVar && cleanVar !== 'default'
    ? `${cleanProd}::${cleanVar}`
    : `${cleanProd}::default`;
}

/**
 * Parses a cart item ID into its productId and variantId components.
 * Backward compatible with legacy un-suffixed product IDs.
 */
export function parseCartItemId(cartItemId: string): { productId: string; variantId: string | null } {
  if (!cartItemId) return { productId: '', variantId: null };
  if (!cartItemId.includes('::')) {
    return { productId: cartItemId, variantId: null };
  }
  const [productId, variantId] = cartItemId.split('::');
  return {
    productId,
    variantId: variantId === 'default' ? null : variantId,
  };
}

/**
 * Gets authoritative line item price from product and selected variant.
 */
export function getEffectiveVariantPrice(product: Product, variant?: ProductVariant | null): number {
  if (variant && typeof variant.price === 'number' && !isNaN(variant.price)) {
    return variant.price;
  }
  return Number(product?.price) || 0;
}

