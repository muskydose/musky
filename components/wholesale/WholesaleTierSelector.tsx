'use client';

import React, { useMemo } from 'react';
import { Product, BulkPricingRule } from '@/lib/types';
import { resolveProductWholesaleUnits, calculateProductBaseWholesaleRate } from '@/lib/wholesale-units';
import { resolveCanonicalWholesalePricing } from '@/lib/wholesale-pricing-resolver';
import { BuyerPersona, PERSONA_CONFIGS } from './PersonaSwitcher';
import { formatPrice } from '@/lib/utils';
import { Layers, Check, Sparkles } from 'lucide-react';

interface WholesaleTierSelectorProps {
  product: Product;
  pricingRules: BulkPricingRule[];
  activePersona: BuyerPersona;
  selectedQuantity: number;
  onSelectQuantity: (quantity: number) => void;
}

export default function WholesaleTierSelector({
  product,
  pricingRules,
  activePersona,
  selectedQuantity,
  onSelectQuantity,
}: WholesaleTierSelectorProps) {
  const unitInfo = useMemo(() => resolveProductWholesaleUnits(product), [product]);
  const unit = unitInfo.wholesaleUnit || 'kg';
  const minWholesaleQuantity = unitInfo.minWholesaleQuantity || 1;

  const baseWholesaleRate = useMemo(
    () => calculateProductBaseWholesaleRate(product, unitInfo),
    [product, unitInfo]
  );

  // Filter applicable rules: product-specific rules first, otherwise global rules
  const applicableRules = useMemo(() => {
    const productRules = pricingRules.filter(
      (r) => r.isActive !== false && r.productId === product.id
    );
    if (productRules.length > 0) return productRules;
    return pricingRules.filter(
      (r) => r.isActive !== false && (!r.productId || r.productId === 'global')
    );
  }, [pricingRules, product.id]);

  // Check if any active discount tier exists for this product
  const hasAnyDiscountTier = useMemo(() => {
    return applicableRules.some(
      (r) => Number(r.discountValue) > 0 || r.discountType === 'fixed_price'
    );
  }, [applicableRules]);

  // Derive candidate quantities from persona presets + rule boundaries
  const candidateQuantities = useMemo(() => {
    const personaConfig = PERSONA_CONFIGS[activePersona];
    const personaPresets = personaConfig?.defaultPresetQuantities || [5, 10, 25, 50];

    const qtySet = new Set<number>();

    // 1. Add rule tier starting boundaries that are valid
    applicableRules.forEach((r) => {
      const min = Number(r.minQuantity);
      if (min >= minWholesaleQuantity) {
        qtySet.add(min);
      }
      // If rule specifies a finite maxQuantity and no subsequent rule covers maxQuantity + 1
      if (r.maxQuantity && Number(r.maxQuantity) > 0) {
        const nextBoundary = Number(r.maxQuantity) + 1;
        const isCovered = applicableRules.some(
          (other) =>
            other !== r &&
            Number(other.minQuantity) <= nextBoundary &&
            (!other.maxQuantity || Number(other.maxQuantity) >= nextBoundary)
        );
        if (!isCovered) {
          qtySet.add(nextBoundary);
        }
      }
    });

    // 2. Add persona preset quantities
    personaPresets.forEach((q) => {
      if (q >= minWholesaleQuantity) {
        qtySet.add(q);
      }
    });

    if (qtySet.size === 0) {
      qtySet.add(minWholesaleQuantity);
    }

    const sorted = Array.from(qtySet).sort((a, b) => a - b);

    // If there are more than 5 quantities, prioritize persona presets and active tier boundaries
    if (sorted.length > 5) {
      const prioritySet = new Set<number>(personaPresets);
      applicableRules.forEach((r) => {
        if (Number(r.minQuantity) >= minWholesaleQuantity) prioritySet.add(Number(r.minQuantity));
      });
      const filtered = Array.from(prioritySet).sort((a, b) => a - b);
      return filtered.slice(0, 5);
    }

    return sorted;
  }, [applicableRules, activePersona, minWholesaleQuantity]);

  // Resolve each candidate slab through the canonical wholesale pricing resolver
  const slabs = useMemo(() => {
    return candidateQuantities.map((q) => {
      const res = resolveCanonicalWholesalePricing({
        product,
        quantity: q,
        rules: pricingRules,
        units: unitInfo,
      });

      const isCustomQuote = res.status === 'CUSTOM_QUOTE';
      const hasDiscount = res.hasConfiguredTier && res.savingsPercent > 0;
      const effectiveRate = res.effectiveWholesaleRate;
      const targetUnit = res.unit;

      const rateLabel = isCustomQuote
        ? 'Custom Factory Quote'
        : `${formatPrice(effectiveRate)} / ${targetUnit}`;

      const discountLabel = isCustomQuote
        ? 'Mandi Terms'
        : hasDiscount
        ? `${Math.round(res.savingsPercent)}% OFF`
        : 'Catalog Rate';

      const accessibleLabel = isCustomQuote
        ? `${q} ${targetUnit}, Custom Factory Quote, mandi-linked volume terms${selectedQuantity === q ? ', currently selected' : ''}`
        : hasDiscount
        ? `${q} ${targetUnit} at ${formatPrice(effectiveRate)} per ${targetUnit}, ${Math.round(res.savingsPercent)} percent discount${selectedQuantity === q ? ', currently selected' : ''}`
        : `${q} ${targetUnit} at ${formatPrice(effectiveRate)} per ${targetUnit}, standard catalog rate${selectedQuantity === q ? ', currently selected' : ''}`;

      return {
        quantity: q,
        unit: targetUnit,
        isCustomQuote,
        hasDiscount,
        effectiveRate,
        savingsPercent: res.savingsPercent,
        rateLabel,
        discountLabel,
        accessibleLabel,
      };
    });
  }, [candidateQuantities, product, pricingRules, unitInfo, selectedQuantity]);

  // Case 1: Product has NO discount tiers configured -> Neutral presentation
  if (!hasAnyDiscountTier) {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
            <h3 className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider">
              Direct Bulk Buy
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#88908a]">
            Factory Catalog Terms
          </span>
        </div>

        {/* Neutral Presentation: Base Rate & No Bulk Discount */}
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-base font-bold text-[#0f2d22]">
              {formatPrice(baseWholesaleRate)} / {unit}
            </div>
            <div className="text-[11px] text-[#626c66] mt-0.5">
              Standard commercial factory rate across all order volumes
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-[#626c66] border border-[#e8e2d5] shrink-0">
            No Bulk Discount
          </span>
        </div>

        {/* Volume Presets without fake promotional badges */}
        <div
          role="radiogroup"
          aria-label="Direct bulk buy volume options"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {slabs.map((slab) => {
            const isSelected = selectedQuantity === slab.quantity;
            return (
              <button
                key={slab.quantity}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${slab.quantity} ${slab.unit}, standard commercial rate${isSelected ? ', currently selected' : ''}`}
                onClick={() => onSelectQuantity(slab.quantity)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[46px] flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#1b4332] bg-[#f4f7f4] ring-2 ring-[#1b4332]/40 shadow-2xs'
                    : 'border-[#e8e2d5] bg-white hover:border-[#b2c8be] hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs font-bold text-[#0f2d22]">
                    {isSelected && <Check className="w-3 h-3 text-[#1b4332] inline mr-1" />}
                    {slab.quantity} {slab.unit}
                  </span>
                  <span className="text-[10px] text-[#88908a]">Base</span>
                </div>
                <div className="font-mono text-[11px] font-semibold text-[#1b4332] mt-1">
                  {formatPrice(slab.effectiveRate)}/{slab.unit}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Case 2: Product has configured discount tiers -> Direct Bulk Buy Slabs
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
          <h3 className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider">
            Direct Bulk Buy
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#626c66] hidden sm:inline">
          Click a slab to preview factory rates
        </span>
      </div>

      {/* Slabs Stack */}
      <div
        role="radiogroup"
        aria-label="Direct bulk buy wholesale tiers"
        className="space-y-2"
      >
        {slabs.map((slab) => {
          const isSelected = selectedQuantity === slab.quantity;

          return (
            <button
              key={slab.quantity}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={slab.accessibleLabel}
              onClick={() => onSelectQuantity(slab.quantity)}
              className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[48px] flex items-center justify-between gap-2 sm:gap-2.5 ${
                isSelected
                  ? 'border-[#1b4332] bg-[#f4f7f4] ring-2 ring-[#1b4332]/40 shadow-xs'
                  : 'border-[#e8e2d5] bg-white hover:border-[#b2c8be] hover:bg-[#FAF8F5]'
              }`}
            >
              {/* Left: Quantity Indicator */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-[76px] sm:min-w-[110px]">
                <span
                  className={`inline-flex items-center font-mono text-xs font-bold px-2 sm:px-2.5 py-1 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-[#1b4332] text-[#c5a059] shadow-2xs'
                      : 'bg-[#FAF8F5] text-[#0f2d22] border border-[#e8e2d5]'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 inline mr-1 text-[#c5a059] shrink-0" />}
                  {slab.isCustomQuote ? `${slab.quantity}+ ${slab.unit}` : `${slab.quantity} ${slab.unit}`}
                </span>
              </div>

              {/* Center: Wholesale Rate */}
              <div className="text-center flex-1 min-w-0">
                <span
                  className={`font-mono text-xs sm:text-sm font-bold truncate block ${
                    slab.isCustomQuote
                      ? 'text-amber-800'
                      : isSelected
                      ? 'text-[#1b4332]'
                      : 'text-[#0f2d22]'
                  }`}
                >
                  {slab.rateLabel}
                </span>
              </div>

              {/* Right: Discount or Tier Badge */}
              <div className="min-w-[65px] sm:min-w-[85px] text-right shrink-0">
                {slab.isCustomQuote ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Mandi Terms
                  </span>
                ) : slab.hasDiscount ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Sparkles className="w-3 h-3 text-emerald-700 hidden sm:inline" />
                    {slab.discountLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-[#FAF8F5] text-[#626c66] border border-[#e8e2d5]">
                    Catalog Rate
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
