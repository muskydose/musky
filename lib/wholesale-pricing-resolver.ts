/**
 * MUSKY DOSE — CANONICAL UNIVERSAL WHOLESALE PRICING RESOLVER
 * 
 * ARCHITECTURAL MANDATE:
 * Exactly ONE canonical function/resolver for effective wholesale pricing.
 * Everything else (PDP, Wholesale Page, Calculator, Admin Preview, Cart, Checkout, WhatsApp)
 * consumes this result.
 * 
 * CORE RULES:
 * 1. For percentage discount:
 *    effectiveWholesaleRate = baseWholesaleRate * (1 - discountPercentage / 100)
 * 2. ONLY use the actual saved discountPercentage. Never replace it with 50%, 0.5,
 *    retail / 2, or any default percentage.
 * 3. Tier selection:
 *    minQuantity <= requestedQuantity AND (maxQuantity is absent OR requestedQuantity <= maxQuantity)
 *    Product-specific tiers override Global tiers.
 * 4. If no matching tier exists:
 *    Do NOT silently use 50%. Return safe "CUSTOM_QUOTE" state instead.
 * 5. Unit integrity:
 *    Base rate and wholesale rate are maintained in the same canonical wholesale unit (kg, Litre, Box, etc.).
 */

import { Product, BulkPricingRule } from './types';
import { resolveProductWholesaleUnits, calculateProductBaseWholesaleRate, ResolvedWholesaleUnits } from './wholesale-units';
import { formatRatePerUnit } from './unit-pricing';
import { formatPrice, formatPercent } from './utils';

export type WholesaleResolutionStatus = 'CONFIRMED' | 'CUSTOM_QUOTE' | 'NO_TIER';

export interface CanonicalWholesaleResolution {
  // Identification & Units
  productId: string;
  productName: string;
  quantity: number;
  unit: string; // Target canonical wholesale unit (e.g. 'kg', 'Litre', 'Box', 'Piece')

  // Rates in target unit
  baseWholesaleRate: number; // Base rate per target unit (e.g. ₹996 for ₹996/kg)
  effectiveWholesaleRate: number; // Effective wholesale rate after tier discount

  // Totals for requested quantity
  regularTotal: number; // quantity * baseWholesaleRate
  effectiveTotal: number; // quantity * effectiveWholesaleRate
  savingsAmount: number; // regularTotal - effectiveTotal
  savingsPercent: number; // Exact discount percentage applied (e.g. 5, 10, 25, 50, 85, 87, 0)
  savingsPerUnit: number; // baseWholesaleRate - effectiveWholesaleRate

  // Verification & Tier Context
  hasConfiguredTier: boolean; // true if an active matching tier was found
  isConfirmed: boolean; // true if backed by an active rule
  status: WholesaleResolutionStatus;
  tierName: string;
  matchedRule?: BulkPricingRule;

  // Safe Display Formats (ready for direct UI rendering, zero client string math)
  display: {
    formattedBaseRate: string; // "₹996 / kg"
    formattedWholesaleRate: string; // "₹149.40 / kg" or "Custom Quote"
    formattedSavingsPerUnit: string; // "₹846.60 / kg"
    formattedRegularTotal: string; // "₹24,900"
    formattedEffectiveTotal: string; // "₹3,735" or "On Request"
    formattedSavingsTotal: string; // "₹21,165" or "Quote on Request"
    formattedSavingsPercent: string; // "85% OFF" or "Custom Quote"
    equivalentPackagesLabel: string; // "100 pouches (250g)"
  };
}

export interface CanonicalWholesaleParams {
  product: Product;
  quantity?: number;
  rules?: BulkPricingRule[];
  units?: ResolvedWholesaleUnits;
  fallbackPolicy?: 'CUSTOM_QUOTE' | 'NO_TIER';
}

export function isCustomQuoteRule(r?: BulkPricingRule | null): boolean {
  if (!r) return false;
  return (
    (r as any).isCustomQuote === true ||
    (r as any).requiresCustomQuote === true ||
    (r.discountType as string) === 'custom' ||
    (r.discountType as string) === 'custom_quote'
  );
}

/**
 * Pure function to select the most specific matching tier rule.
 * Product-specific rules take precedence over global rules.
 * Within the same scope, the rule with the highest minQuantity is selected.
 *
 * UNIVERSAL BULK TIER INHERITANCE (Phase 10E Batch 06):
 * If requested quantity exceeds the highest standard tier's maxQuantity,
 * the highest configured standard tier (where minQuantity <= requestedQuantity)
 * is inherited and continues to apply, UNLESS an explicit custom-quote /
 * high-volume rule takes precedence.
 */
export function selectMatchingWholesaleTier(
  rules: BulkPricingRule[],
  productId: string,
  quantity: number
): BulkPricingRule | undefined {
  if (!rules || rules.length === 0 || quantity == null || isNaN(quantity) || quantity <= 0) {
    return undefined;
  }

  const findBestRuleForScope = (scopeRules: BulkPricingRule[]): BulkPricingRule | undefined => {
    // 1. Filter to active rules whose minQuantity has been reached
    const eligible = scopeRules.filter(
      (r) => r.isActive !== false && quantity >= Number(r.minQuantity)
    );

    if (eligible.length === 0) return undefined;

    // 2. First check for an exact range match (minQuantity <= quantity <= maxQuantity)
    const exactMatches = eligible.filter(
      (r) => r.maxQuantity === undefined || r.maxQuantity === null || quantity <= Number(r.maxQuantity)
    );

    if (exactMatches.length > 0) {
      return exactMatches.sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity))[0];
    }

    // 3. Tier Inheritance: No exact range match found because quantity exceeds maxQuantity
    // of configured tiers. Select the highest configured standard tier where tier.minQuantity <= requestedQuantity.
    // Continue using that tier for higher quantities unless an explicit custom/high-volume rule takes precedence.
    const sortedDescending = [...eligible].sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity));
    return sortedDescending[0];
  };

  // 1. Search product-specific rules first
  const productScopeRules = rules.filter((r) => r.productId === productId);
  const matchedProductRule = findBestRuleForScope(productScopeRules);
  if (matchedProductRule) {
    return matchedProductRule;
  }

  // 2. Fall back to global rules
  const globalScopeRules = rules.filter((r) => !r.productId || r.productId === 'global');
  const matchedGlobalRule = findBestRuleForScope(globalScopeRules);
  if (matchedGlobalRule) {
    return matchedGlobalRule;
  }

  return undefined;
}

/**
 * CANONICAL ADMIN-BACKED WHOLESALE TIERS DISCOVERY
 *
 * Returns the exact list of configured quantities for a given product
 * from the Admin-defined BulkPricingRule source of truth.
 * Product-specific rules take precedence over global rules.
 * Preserves configured sortOrder, then minQuantity.
 * Returns empty array if no rules exist.
 */
export function getAuthoritativeWholesaleTiers(
  product: Product,
  rules: BulkPricingRule[]
): number[] {
  if (!rules || rules.length === 0) return [];

  // 1. Search product-specific rules first
  const productRules = rules.filter(
    (r) => r.isActive !== false && r.productId === product.id
  );

  if (productRules.length > 0) {
    const sorted = [...productRules].sort(
      (a, b) => (Number(a.sortOrder) || 1) - (Number(b.sortOrder) || 1) || Number(a.minQuantity) - Number(b.minQuantity)
    );
    return Array.from(new Set(sorted.map((r) => Number(r.minQuantity))));
  }

  // 2. Fall back to global rules if no product-specific rules exist
  const globalRules = rules.filter(
    (r) => r.isActive !== false && (!r.productId || r.productId === 'global')
  );

  if (globalRules.length > 0) {
    const sorted = [...globalRules].sort(
      (a, b) => (Number(a.sortOrder) || 1) - (Number(b.sortOrder) || 1) || Number(a.minQuantity) - Number(b.minQuantity)
    );
    return Array.from(new Set(sorted.map((r) => Number(r.minQuantity))));
  }

  return [];
}


/**
 * THE SINGLE AUTHORITATIVE CANONICAL WHOLESALE PRICING RESOLVER
 * All storefront, calculator, cart, checkout, admin, and quote flows consume this function.
 */
export function resolveCanonicalWholesalePricing({
  product,
  quantity,
  rules = [],
  units: providedUnits,
  fallbackPolicy = 'CUSTOM_QUOTE',
}: CanonicalWholesaleParams): CanonicalWholesaleResolution {
  // 1. Resolve Canonical Commercial Units
  const units = providedUnits || resolveProductWholesaleUnits(product);
  const targetUnit = units.wholesaleUnit || 'kg';

  // 2. Resolve Base Wholesale Rate in Target Unit
  const baseWholesaleRate = calculateProductBaseWholesaleRate(product, units);

  // 3. Resolve Requested Quantity
  const minQty = units.minWholesaleQuantity || 1;
  const effectiveQty = quantity != null && quantity > 0 ? quantity : minQty;

  // 4. Select Matching Tier Rule
  const matchedRule = selectMatchingWholesaleTier(rules, product.id, effectiveQty);

  // 5. Calculate Effective Wholesale Rate & Savings
  let effectiveWholesaleRate = baseWholesaleRate;
  let savingsPercent = 0;
  let hasConfiguredTier = false;
  let isConfirmed = false;
  let status: WholesaleResolutionStatus = fallbackPolicy;
  let tierName = 'Base Catalog Rate';

  if (matchedRule && !isCustomQuoteRule(matchedRule)) {
    hasConfiguredTier = true;
    isConfirmed = true;
    status = 'CONFIRMED';

    const isInherited = matchedRule.maxQuantity != null && effectiveQty > Number(matchedRule.maxQuantity);
    const rangeLabel = isInherited
      ? `${matchedRule.minQuantity}+ ${targetUnit}`
      : `${matchedRule.minQuantity}${
          matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
        } ${targetUnit}`;

    if (matchedRule.discountType === 'percentage') {
      // CRITICAL: Strictly use admin-entered percentage.
      // Validation guarantees 0 <= discountValue <= 100.
      // NEVER clamp to 50 or replace with retail / 2.
      const rawDiscount = Number(matchedRule.discountValue);
      const discountPercentage = Math.min(100, Math.max(0, isNaN(rawDiscount) ? 0 : rawDiscount));
      effectiveWholesaleRate = Math.round(baseWholesaleRate * (1 - discountPercentage / 100) * 100) / 100;
      savingsPercent = discountPercentage;

      tierName = `Active Tier (${discountPercentage}% Off: ${rangeLabel})`;
    } else if (matchedRule.discountType === 'fixed_amount') {
      const fixedDiscount = Math.max(0, Number(matchedRule.discountValue) || 0);
      effectiveWholesaleRate = Math.max(0, Math.round((baseWholesaleRate - fixedDiscount) * 100) / 100);
      savingsPercent = baseWholesaleRate > 0 ? ((baseWholesaleRate - effectiveWholesaleRate) / baseWholesaleRate) * 100 : 0;

      tierName = `Active Tier (₹${fixedDiscount}/${targetUnit} Off: ${rangeLabel})`;
    } else if (matchedRule.discountType === 'fixed_price') {
      const fixedRate = Math.max(0, Number(matchedRule.discountValue) || 0);
      effectiveWholesaleRate = Math.round(fixedRate * 100) / 100;
      savingsPercent = baseWholesaleRate > 0 ? Math.max(0, ((baseWholesaleRate - fixedRate) / baseWholesaleRate) * 100) : 0;

      tierName = `Fixed Special Tier (₹${fixedRate}/${targetUnit}: ${rangeLabel})`;
    }
  } else {
    // STATE: No configured tier or explicit custom quote boundary -> Clean Custom Quote state without fabricated discounts
    hasConfiguredTier = false;
    isConfirmed = false;
    status = fallbackPolicy;
    effectiveWholesaleRate = baseWholesaleRate;
    savingsPercent = 0;
    tierName = 'Custom Factory Quote Required';
  }

  // Safety floor: rates cannot be negative and rounded to 2 decimal places
  effectiveWholesaleRate = Math.max(0, Math.round(effectiveWholesaleRate * 100) / 100);

  // 6. Compute Totals & Precise Savings
  const regularTotal = Math.round(baseWholesaleRate * effectiveQty * 100) / 100;
  const effectiveTotal = Math.round(effectiveWholesaleRate * effectiveQty * 100) / 100;
  const savingsAmount = hasConfiguredTier ? Math.max(0, Math.round((regularTotal - effectiveTotal) * 100) / 100) : 0;
  const savingsPerUnit = hasConfiguredTier ? Math.max(0, Math.round((baseWholesaleRate - effectiveWholesaleRate) * 100) / 100) : 0;

  // 7. Safe Pre-Formatted Display Strings
  const formattedBaseRate = formatRatePerUnit(baseWholesaleRate, targetUnit);
  const formattedWholesaleRate =
    hasConfiguredTier
      ? formatRatePerUnit(effectiveWholesaleRate, targetUnit)
      : 'Custom Quote';
  const formattedSavingsPerUnit =
    savingsAmount > 0 ? formatRatePerUnit(savingsPerUnit, targetUnit) : '₹0';
  const formattedRegularTotal = formatPrice(regularTotal);
  const formattedEffectiveTotal =
    hasConfiguredTier
      ? formatPrice(effectiveTotal)
      : 'On Request';
  const formattedSavingsTotal =
    savingsAmount > 0 ? formatPrice(savingsAmount) : 'Quote on Request';

  // Format percentage display: integer percentage if whole (e.g. "85% OFF"), up to 2 decimal places if fractional (e.g. "73.25% OFF")
  const pctString = formatPercent(savingsPercent);
  const formattedSavingsPercent = hasConfiguredTier ? `${pctString} OFF` : 'Custom Quote';

  return {
    productId: product.id,
    productName: product.name,
    quantity: effectiveQty,
    unit: targetUnit,
    baseWholesaleRate,
    effectiveWholesaleRate,
    regularTotal,
    effectiveTotal,
    savingsAmount,
    savingsPercent,
    savingsPerUnit,
    hasConfiguredTier,
    isConfirmed,
    status,
    tierName,
    matchedRule,
    display: {
      formattedBaseRate,
      formattedWholesaleRate,
      formattedSavingsPerUnit,
      formattedRegularTotal,
      formattedEffectiveTotal,
      formattedSavingsTotal,
      formattedSavingsPercent,
      equivalentPackagesLabel: units.equivalentPackagesText(effectiveQty),
    },
  };
}
