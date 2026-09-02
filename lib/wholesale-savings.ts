/**
 * MUSKY DOSE — UNIVERSAL WHOLESALE VALUE & SAVINGS ENGINE
 * 
 * CORE GOVERNANCE RULES:
 * 1. Always compare Retail Value vs Wholesale Price in the SAME CANONICAL TARGET UNIT.
 * 2. Never compare ₹/g against ₹/kg, ₹/ml against ₹/Litre, or ₹/cone against ₹/Box.
 * 3. Never calculate percentages from rounded display strings; compute strictly from raw numbers.
 * 4. Three transparent states:
 *    - STATE A: CONFIRMED (actual Admin/BulkPricingRule exists)
 *    - STATE B: INDICATIVE (no active rule, preview potential with clear disclaimer)
 *    - STATE C: CUSTOM_QUOTE (manual quotation required, zero fabricated rates)
 * 5. Maximum configurable tier framework up to 50%.
 */

import { Product, BulkPricingRule } from './types';
import { resolveProductWholesaleUnits, ResolvedWholesaleUnits } from './wholesale-units';
import {
  deriveCanonicalRate,
  deriveDualProductRates,
  formatRatePerUnit,
  normalizeUnitString,
} from './unit-pricing';

export type SavingsSource = 'CONFIRMED' | 'INDICATIVE' | 'CUSTOM_QUOTE';

export interface WholesaleSavingsResult {
  // Unit & Quantity Context
  productId: string;
  productName: string;
  quantity: number;
  unit: string; // The canonical wholesale comparison unit (e.g. 'kg', 'Litre', 'Box')

  // Rates in target unit
  retailUnitRate: number; // Retail price per target unit (e.g. 996 for ₹996/kg)
  wholesaleUnitRate: number; // Wholesale price per target unit (e.g. 850 for ₹850/kg)

  // Totals for the specified quantity
  retailTotal: number; // quantity * retailUnitRate
  wholesaleTotal: number; // quantity * wholesaleUnitRate
  savingsAmount: number; // retailTotal - wholesaleTotal
  savingsPercent: number; // (savingsAmount / retailTotal) * 100

  // Per-unit savings
  savingsPerUnit: number; // retailUnitRate - wholesaleUnitRate

  // Verification & State
  isConfirmed: boolean; // true if backed by an active database rule
  source: SavingsSource;
  tierName: string;
  matchedRule?: BulkPricingRule;

  // Formatted display values (safe for rendering, no string-math risk)
  display: {
    formattedRetailRate: string; // "₹996 / kg"
    formattedWholesaleRate: string; // "₹850 / kg"
    formattedSavingsPerUnit: string; // "₹146 / kg"
    formattedRetailTotal: string; // "₹9,960"
    formattedWholesaleTotal: string; // "₹8,500"
    formattedSavingsTotal: string; // "₹1,460"
    formattedSavingsPercent: string; // "14.7%"
    equivalentPackagesLabel: string; // "40 pouches (250g)"
  };
}

/**
 * Standard suggested tier framework templates (up to 50%).
 * These are configurable templates, NOT automatically guaranteed discounts.
 */
export const WHOLESALE_BENEFIT_TIER_TEMPLATES = [
  { label: '5% Starter Bulk', percent: 5, minQty: 5 },
  { label: '10% Salon / Studio Tier', percent: 10, minQty: 10 },
  { label: '15% Volume Wholesale', percent: 15, minQty: 25 },
  { label: '20% Master Distributor', percent: 20, minQty: 50 },
  { label: '25% Factory Direct', percent: 25, minQty: 100 },
  { label: '30% Regional Depot', percent: 30, minQty: 250 },
  { label: '35% Export Tier', percent: 35, minQty: 500 },
  { label: '40% Semi-Bulk Container', percent: 40, minQty: 1000 },
  { label: '50% Maximum Enterprise Tier', percent: 50, minQty: 2500 },
];

export interface DeriveWholesaleSavingsParams {
  product: Product;
  quantity?: number;
  rules?: BulkPricingRule[];
  units?: ResolvedWholesaleUnits;
  indicativeDiscountPercent?: number; // Optional preview % if no rule exists
}

/**
 * Derives the canonical wholesale value and savings comparison.
 * Strictly adheres to:
 * - retailUnitRate in wholesaleUnit
 * - wholesaleUnitRate in wholesaleUnit
 * - savingsAmount = retailTotal - wholesaleTotal
 * - savingsPercent = (savingsAmount / retailTotal) * 100
 */
export function deriveWholesaleSavings({
  product,
  quantity,
  rules = [],
  units: providedUnits,
  indicativeDiscountPercent,
}: DeriveWholesaleSavingsParams): WholesaleSavingsResult {
  const units = providedUnits || resolveProductWholesaleUnits(product);
  const targetUnit = units.wholesaleUnit;

  // 1. Resolve Canonical Retail Rate in target Wholesale Unit
  // e.g. For 250g Henna @ ₹249, retailUnitRate in kg is ₹996/kg
  const retailUnitRate = units.rates.wholesaleRate.rate;

  // 2. Resolve requested quantity
  const minQty = units.minWholesaleQuantity || 1;
  const effectiveQty = quantity != null && quantity > 0 ? quantity : minQty;

  // 3. Search for active matching Admin rule
  let matchedRule: BulkPricingRule | undefined = undefined;
  if (rules.length > 0) {
    // Product-specific rule first
    matchedRule = rules.find((r) => {
      if (!r.isActive || r.productId !== product.id) return false;
      const minOk = effectiveQty >= r.minQuantity;
      const maxOk = !r.maxQuantity || effectiveQty <= r.maxQuantity;
      return minOk && maxOk;
    });

    // Global rule fallback
    if (!matchedRule) {
      matchedRule = rules.find((r) => {
        if (!r.isActive || (r.productId && r.productId !== 'global')) return false;
        const minOk = effectiveQty >= r.minQuantity;
        const maxOk = !r.maxQuantity || effectiveQty <= r.maxQuantity;
        return minOk && maxOk;
      });
    }
  }

  let wholesaleUnitRate = retailUnitRate;
  let source: SavingsSource = 'CUSTOM_QUOTE';
  let tierName = 'Base Catalog Rate';
  let isConfirmed = false;

  // 4. Calculate Wholesale Rate based on Rule State
  if (matchedRule) {
    isConfirmed = true;
    source = 'CONFIRMED';

    if (matchedRule.discountType === 'percentage') {
      const discountVal = Math.min(50, Math.max(0, matchedRule.discountValue));
      wholesaleUnitRate = retailUnitRate * (1 - discountVal / 100);
      tierName = `Active Tier (${discountVal}% Off: ${matchedRule.minQuantity}${
        matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
      } ${targetUnit})`;
    } else if (matchedRule.discountType === 'fixed_amount') {
      const discountVal = Math.min(retailUnitRate * 0.5, Math.max(0, matchedRule.discountValue));
      wholesaleUnitRate = Math.max(1, retailUnitRate - discountVal);
      tierName = `Active Tier (₹${matchedRule.discountValue}/${targetUnit} Off: ${matchedRule.minQuantity}${
        matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
      } ${targetUnit})`;
    } else if (matchedRule.discountType === 'fixed_price') {
      wholesaleUnitRate = Math.max(1, matchedRule.discountValue);
      tierName = `Fixed Special Tier (₹${matchedRule.discountValue}/${targetUnit}: ${matchedRule.minQuantity}${
        matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
      } ${targetUnit})`;
    }
  } else if (indicativeDiscountPercent != null && indicativeDiscountPercent > 0) {
    // STATE B: Indicative Preview
    source = 'INDICATIVE';
    isConfirmed = false;
    const boundedPercent = Math.min(50, Math.max(0, indicativeDiscountPercent));
    wholesaleUnitRate = retailUnitRate * (1 - boundedPercent / 100);
    tierName = `Indicative Bulk Benefit (~${boundedPercent}% Est.)`;
  } else {
    // STATE C: Custom Quote Required
    source = 'CUSTOM_QUOTE';
    isConfirmed = false;
    wholesaleUnitRate = retailUnitRate;
    tierName = 'Custom Factory Quote Required';
  }

  // Safety caps: reject negative or inverted discounts unless custom pricing
  wholesaleUnitRate = Math.max(0.1, wholesaleUnitRate);

  // 5. Compute Totals & Savings (strict raw arithmetic)
  const retailTotal = Math.round(retailUnitRate * effectiveQty * 100) / 100;
  const wholesaleTotal = Math.round(wholesaleUnitRate * effectiveQty * 100) / 100;
  const savingsAmount = Math.max(0, Math.round((retailTotal - wholesaleTotal) * 100) / 100);
  const savingsPercent = retailTotal > 0 ? (savingsAmount / retailTotal) * 100 : 0;
  const savingsPerUnit = Math.max(0, retailUnitRate - wholesaleUnitRate);

  // 6. Safe Formatting for Display
  const formattedRetailRate = formatRatePerUnit(retailUnitRate, targetUnit);
  const formattedWholesaleRate =
    source === 'CUSTOM_QUOTE' ? 'Custom Quote' : formatRatePerUnit(wholesaleUnitRate, targetUnit);
  const formattedSavingsPerUnit =
    savingsAmount > 0 ? formatRatePerUnit(savingsPerUnit, targetUnit) : '₹0';
  const formattedRetailTotal = `₹${Math.round(retailTotal).toLocaleString('en-IN')}`;
  const formattedWholesaleTotal =
    source === 'CUSTOM_QUOTE' ? 'On Request' : `₹${Math.round(wholesaleTotal).toLocaleString('en-IN')}`;
  const formattedSavingsTotal =
    savingsAmount > 0 ? `₹${Math.round(savingsAmount).toLocaleString('en-IN')}` : 'Quote on Request';
  const formattedSavingsPercent = `${(Math.round(savingsPercent * 10) / 10).toFixed(1)}%`;

  return {
    productId: product.id,
    productName: product.name,
    quantity: effectiveQty,
    unit: targetUnit,
    retailUnitRate,
    wholesaleUnitRate,
    retailTotal,
    wholesaleTotal,
    savingsAmount,
    savingsPercent,
    savingsPerUnit,
    isConfirmed,
    source,
    tierName,
    matchedRule,
    display: {
      formattedRetailRate,
      formattedWholesaleRate,
      formattedSavingsPerUnit,
      formattedRetailTotal,
      formattedWholesaleTotal,
      formattedSavingsTotal,
      formattedSavingsPercent,
      equivalentPackagesLabel: units.equivalentPackagesText(effectiveQty),
    },
  };
}
