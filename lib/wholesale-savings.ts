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
 * 5. Universal configurable tier framework (0% to 100%).
 */

import { Product, BulkPricingRule } from './types';
import { resolveProductWholesaleUnits, ResolvedWholesaleUnits } from './wholesale-units';
import {
  deriveCanonicalRate,
  deriveDualProductRates,
  formatRatePerUnit,
  normalizeUnitString,
} from './unit-pricing';
import {
  resolveCanonicalWholesalePricing,
  CanonicalWholesaleResolution,
} from './wholesale-pricing-resolver';
import { formatPrice, formatPercent } from './utils';

export * from './wholesale-pricing-resolver';

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
 * Standard suggested tier framework templates.
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
  { label: '50% Enterprise Tier', percent: 50, minQty: 2500 },
  { label: '85% Commercial Volume Tier', percent: 85, minQty: 5000 },
  { label: '87% Maximum Wholesale Tier', percent: 87, minQty: 10000 },
  { label: '90% Mega Commercial Tier', percent: 90, minQty: 25000 },
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
 * Delegates directly to the single authoritative canonical resolver: resolveCanonicalWholesalePricing.
 */
export function deriveWholesaleSavings({
  product,
  quantity,
  rules = [],
  units: providedUnits,
  indicativeDiscountPercent,
}: DeriveWholesaleSavingsParams): WholesaleSavingsResult {
  const units = providedUnits || resolveProductWholesaleUnits(product);
  const targetUnit = units.wholesaleUnit || 'kg';
  const minQty = units.minWholesaleQuantity || 1;
  const effectiveQty = quantity != null && quantity > 0 ? quantity : minQty;
  const retailUnitRate = units.rates.wholesaleRate.rate;

  const canonical = resolveCanonicalWholesalePricing({
    product,
    quantity: effectiveQty,
    rules,
    units,
    fallbackPolicy: 'CUSTOM_QUOTE',
  });

  if (canonical.hasConfiguredTier && canonical.matchedRule) {
    return {
      productId: product.id,
      productName: product.name,
      quantity: effectiveQty,
      unit: targetUnit,
      retailUnitRate: canonical.baseWholesaleRate,
      wholesaleUnitRate: canonical.effectiveWholesaleRate,
      retailTotal: canonical.regularTotal,
      wholesaleTotal: canonical.effectiveTotal,
      savingsAmount: canonical.savingsAmount,
      savingsPercent: canonical.savingsPercent,
      savingsPerUnit: canonical.savingsPerUnit,
      isConfirmed: true,
      source: 'CONFIRMED',
      tierName: canonical.tierName,
      matchedRule: canonical.matchedRule,
      display: {
        formattedRetailRate: canonical.display.formattedBaseRate,
        formattedWholesaleRate: canonical.display.formattedWholesaleRate,
        formattedSavingsPerUnit: canonical.display.formattedSavingsPerUnit,
        formattedRetailTotal: canonical.display.formattedRegularTotal,
        formattedWholesaleTotal: canonical.display.formattedEffectiveTotal,
        formattedSavingsTotal: canonical.display.formattedSavingsTotal,
        formattedSavingsPercent: formatPercent(canonical.savingsPercent),
        equivalentPackagesLabel: canonical.display.equivalentPackagesLabel,
      },
    };
  }

  // Handle explicit indicative preview request only if explicitly passed
  if (indicativeDiscountPercent != null && indicativeDiscountPercent > 0) {
    const boundedPercent = Math.min(100, Math.max(0, indicativeDiscountPercent));
    const wholesaleUnitRate = Math.max(0, retailUnitRate * (1 - boundedPercent / 100));
    const retailTotal = Math.round(retailUnitRate * effectiveQty * 100) / 100;
    const wholesaleTotal = Math.round(wholesaleUnitRate * effectiveQty * 100) / 100;
    const savingsAmount = Math.max(0, Math.round((retailTotal - wholesaleTotal) * 100) / 100);
    const savingsPercent = retailTotal > 0 ? (savingsAmount / retailTotal) * 100 : 0;
    const savingsPerUnit = Math.max(0, retailUnitRate - wholesaleUnitRate);

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
      isConfirmed: false,
      source: 'INDICATIVE',
      tierName: `Indicative Bulk Benefit (~${boundedPercent}% Est.)`,
      display: {
        formattedRetailRate: formatRatePerUnit(retailUnitRate, targetUnit),
        formattedWholesaleRate: formatRatePerUnit(wholesaleUnitRate, targetUnit),
        formattedSavingsPerUnit: savingsAmount > 0 ? formatRatePerUnit(savingsPerUnit, targetUnit) : '₹0',
        formattedRetailTotal: formatPrice(retailTotal),
        formattedWholesaleTotal: formatPrice(wholesaleTotal),
        formattedSavingsTotal: savingsAmount > 0 ? formatPrice(savingsAmount) : 'Quote on Request',
        formattedSavingsPercent: formatPercent(savingsPercent),
        equivalentPackagesLabel: units.equivalentPackagesText(effectiveQty),
      },
    };
  }

  // Fallback: Safe Custom Quote state
  return {
    productId: product.id,
    productName: product.name,
    quantity: effectiveQty,
    unit: targetUnit,
    retailUnitRate,
    wholesaleUnitRate: retailUnitRate,
    retailTotal: Math.round(retailUnitRate * effectiveQty * 100) / 100,
    wholesaleTotal: Math.round(retailUnitRate * effectiveQty * 100) / 100,
    savingsAmount: 0,
    savingsPercent: 0,
    savingsPerUnit: 0,
    isConfirmed: false,
    source: 'CUSTOM_QUOTE',
    tierName: 'Custom Factory Quote Required',
    display: {
      formattedRetailRate: formatRatePerUnit(retailUnitRate, targetUnit),
      formattedWholesaleRate: 'Custom Quote',
      formattedSavingsPerUnit: '₹0',
      formattedRetailTotal: `₹${Math.round(retailUnitRate * effectiveQty).toLocaleString('en-IN')}`,
      formattedWholesaleTotal: 'On Request',
      formattedSavingsTotal: 'Quote on Request',
      formattedSavingsPercent: '0%',
      equivalentPackagesLabel: units.equivalentPackagesText(effectiveQty),
    },
  };
}
