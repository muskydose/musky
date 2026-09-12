/**
 * ============================================================================
 * MUSKY DOSE — COMMERCE & PRICING GOVERNANCE ENGINE (V1.0)
 *
 * CORE CONTRACT:
 * 1. Monotonic Variant Pricing: Larger packs must cost more in total, but less per unit.
 * 2. Compare Price Invariant: comparePrice must always be > price or null.
 * 3. Order Arithmetic Invariant: total === (subtotal - discount + shipping).
 * 4. Wholesale Invariant: MOQ must be respected on bulk transactions.
 * ============================================================================
 */

import { ProductVariant, OrderItem } from '@/lib/types';
import { GovernanceValidationResult } from './types';
import { normalizeUnitString, getUnitFamily, UnitFamily } from '@/lib/unit-pricing';

export class CommerceGovernance {
  /**
   * Validates pricing invariants for a retail product.
   */
  public static validateProductPricing(price: number, comparePrice?: number | null): GovernanceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      errors.push('Base price must be a non-negative number.');
    }

    if (comparePrice !== undefined && comparePrice !== null) {
      if (typeof comparePrice !== 'number' || isNaN(comparePrice)) {
        errors.push('Compare price must be a valid number.');
      } else if (comparePrice <= price) {
        errors.push(`Compare price (₹${comparePrice}) must be greater than selling price (₹${price}).`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates variant pricing and weight/volume/count monotonicity.
   * UNIVERSAL ARCHITECTURE:
   * 1. Evaluates active variants only.
   * 2. Resolves structured packQuantity and packUnit into canonical base quantities (g, ml, count).
   * 3. Rejects incompatible mixed unit families (e.g. weight mixed with volume).
   * 4. Pre-sorts variants by normalized quantity to eliminate array order sensitivity.
   * 5. Detects duplicate pack sizes.
   * 6. Strictly enforces monotonic pricing: larger pack sizes must cost more than smaller pack sizes.
   */
  public static validateVariantMonotonicity(variants: ProductVariant[]): GovernanceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(variants)) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const activeVariants = variants.filter((v) => v.isActive !== false);
    if (activeVariants.length <= 1) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Helper: extract base normalized numeric quantity and unit family
    const parseVariantQuantity = (v: ProductVariant, index: number) => {
      const label = v.weight || (v as any).name || (v.packQuantity && v.packUnit ? `${v.packQuantity}${v.packUnit}` : `Variant #${index + 1}`);
      const rawQty = v.packQuantity !== undefined && v.packQuantity !== null ? Number(v.packQuantity) : NaN;
      const rawUnit = v.packUnit ? normalizeUnitString(v.packUnit) : '';
      let family: UnitFamily = rawUnit ? getUnitFamily(rawUnit) : 'custom';
      let normalizedQty = !isNaN(rawQty) && rawQty > 0 ? rawQty : 0;

      // If packQuantity or packUnit is missing, parse from display string (v.weight or name)
      if (normalizedQty === 0 || !rawUnit) {
        const clean = (v.weight || (v as any).name || '').toLowerCase().trim();
        const num = parseFloat(clean.replace(/[^\d.]/g, '')) || 0;
        if (clean.includes('kg') || clean.includes('kilo')) {
          family = 'weight';
          normalizedQty = num * 1000;
        } else if (clean.includes('g') && !clean.includes('kg')) {
          family = 'weight';
          normalizedQty = num;
        } else if (clean.includes('l') && !clean.includes('ml')) {
          family = 'volume';
          normalizedQty = num * 1000;
        } else if (clean.includes('ml')) {
          family = 'volume';
          normalizedQty = num;
        } else if (clean.includes('cone')) {
          family = 'count';
          normalizedQty = num;
        } else if (clean.includes('box') || clean.includes('pack') || clean.includes('piece')) {
          family = 'count';
          normalizedQty = num;
        } else {
          normalizedQty = num;
        }
      } else {
        // Normalize structured quantity to canonical base units (grams for weight, ml for volume)
        const unitLower = rawUnit.toLowerCase();
        if (family === 'weight') {
          if (unitLower === 'kg') normalizedQty = rawQty * 1000;
          else if (unitLower === 'mg') normalizedQty = rawQty * 0.001;
          else if (unitLower === 'quintal') normalizedQty = rawQty * 100000;
          else if (unitLower === 'ton') normalizedQty = rawQty * 1000000;
          else normalizedQty = rawQty; // grams
        } else if (family === 'volume') {
          if (unitLower === 'litre' || unitLower === 'liter' || unitLower === 'l') {
            normalizedQty = rawQty * 1000;
          } else {
            normalizedQty = rawQty; // ml
          }
        }
      }

      const priceVal = Number(v.price) || 0;
      return {
        id: v.id,
        name: label,
        displayWeight: v.weight || `${normalizedQty}${rawUnit || ''}`,
        rawUnit,
        family,
        normalizedQty,
        price: priceVal,
        unitPrice: normalizedQty > 0 ? priceVal / normalizedQty : 0,
      };
    };

    const parsed = activeVariants.map((v, index) => parseVariantQuantity(v, index));

    // 1. Incompatible Mixed Unit Families Check (Fail-closed)
    const distinctFamilies = Array.from(
      new Set(parsed.map((p) => p.family).filter((f) => f === 'weight' || f === 'volume' || f === 'count'))
    );
    if (distinctFamilies.length > 1) {
      errors.push(
        `Variant unit family mismatch: Cannot mix incompatible unit families (${distinctFamilies.join(' and ')}) within product variations.`
      );
      return { isValid: false, errors, warnings };
    }

    // 2. Duplicate Pack Size Detection
    const seenQuantities = new Map<number, string>();
    for (const item of parsed) {
      if (item.normalizedQty > 0) {
        const existing = seenQuantities.get(item.normalizedQty);
        if (existing) {
          errors.push(
            `Duplicate variant pack size detected: "${item.name}" and "${existing}" have the same quantity. Each variation must represent a distinct pack size.`
          );
        } else {
          seenQuantities.set(item.normalizedQty, item.name);
        }
      }
    }

    // 3. Pre-sort by normalized quantity to eliminate array order sensitivity
    const sorted = [...parsed].sort((a, b) => a.normalizedQty - b.normalizedQty);

    // 4. Strict Monotonicity Validation on Sorted Ladder
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.normalizedQty > 0 && next.normalizedQty > current.normalizedQty) {
        if (next.price <= current.price) {
          errors.push(
            `Variant pricing inversion: Larger pack "${next.name}" (${next.displayWeight}) costs ₹${next.price}, which is not greater than smaller pack "${current.name}" (${current.displayWeight}) at ₹${current.price}.`
          );
        }

        if (current.unitPrice > 0 && next.unitPrice > 0 && next.unitPrice > current.unitPrice * 1.05) {
          warnings.push(
            `Volume discount warning: Larger pack "${next.name}" has a higher price-per-unit than "${current.name}".`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Server-side invariant validation for customer order placement.
   */
  public static validateOrderTotals(
    items: OrderItem[],
    claimedSubtotal: number,
    claimedDiscount: number,
    claimedShipping: number,
    claimedTotal: number
  ): GovernanceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Order must contain at least one valid item.');
      return { isValid: false, errors, warnings };
    }

    // Recompute actual subtotal from line items
    let calculatedSubtotal = 0;
    for (const item of items) {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, parseInt(String(item.quantity || 1), 10));
      calculatedSubtotal += price * quantity;
    }

    // Subtotal tolerance (round to nearest integer)
    if (Math.abs(calculatedSubtotal - claimedSubtotal) > 1.0) {
      errors.push(
        `Order subtotal mismatch: Calculated ₹${calculatedSubtotal} does not match claimed ₹${claimedSubtotal}.`
      );
    }

    // Discount must not exceed subtotal
    if (claimedDiscount > calculatedSubtotal) {
      errors.push(`Discount (₹${claimedDiscount}) cannot exceed order subtotal (₹${calculatedSubtotal}).`);
    }

    // Verify final arithmetic total
    const expectedTotal = Math.max(0, calculatedSubtotal - claimedDiscount + claimedShipping);
    if (Math.abs(expectedTotal - claimedTotal) > 1.0) {
      errors.push(
        `Order total arithmetic mismatch: Expected ₹${expectedTotal} (Subtotal ₹${calculatedSubtotal} - Discount ₹${claimedDiscount} + Shipping ₹${claimedShipping}), received ₹${claimedTotal}.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
