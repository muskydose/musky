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
   * Validates variant pricing and weight monotonicity.
   */
  public static validateVariantMonotonicity(variants: ProductVariant[]): GovernanceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(variants) || variants.length <= 1) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Parse weights into numeric grams/milliliters where possible
    const parseUnit = (weightStr: string): number => {
      const clean = (weightStr || '').toLowerCase().trim();
      const num = parseFloat(clean.replace(/[^\d.]/g, '')) || 0;
      if (clean.includes('kg')) return num * 1000;
      if (clean.includes('l') && !clean.includes('ml')) return num * 1000;
      return num;
    };

    const parsed = variants.map((v, index) => {
      const label = (v as any).name || v.weight || `Variant ${index + 1}`;
      const weightVal = parseUnit(v.weight || (v as any).name);
      const priceVal = Number(v.price) || 0;
      return {
        index,
        name: label,
        weight: weightVal,
        price: priceVal,
        unitPrice: weightVal > 0 ? priceVal / weightVal : 0,
      };
    });

    // Check price monotonicity: as weight increases, total price must increase
    for (let i = 0; i < parsed.length - 1; i++) {
      const current = parsed[i];
      const next = parsed[i + 1];

      if (current.weight > 0 && next.weight > 0 && next.weight > current.weight) {
        if (next.price <= current.price) {
          errors.push(
            `Variant pricing inversion: "${next.name}" (${next.weight}g) costs ₹${next.price}, which is not greater than "${current.name}" (${current.weight}g) at ₹${current.price}.`
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
