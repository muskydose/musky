'use client';

import React, { useMemo } from 'react';
import { Product, BulkPricingRule } from '@/lib/types';
import { resolveProductWholesaleUnits } from '@/lib/wholesale-units';
import { getAuthoritativeWholesaleTiers } from '@/lib/wholesale-pricing-resolver';
import { BuyerPersona } from './PersonaSwitcher';
import { Layers, Check } from 'lucide-react';

interface WholesaleTierSelectorProps {
  product: Product;
  pricingRules: BulkPricingRule[];
  activePersona?: BuyerPersona;
  selectedQuantity: number;
  onSelectQuantity: (quantity: number) => void;
}

export default function WholesaleTierSelector({
  product,
  pricingRules,
  selectedQuantity,
  onSelectQuantity,
}: WholesaleTierSelectorProps) {
  const unitInfo = useMemo(() => resolveProductWholesaleUnits(product), [product]);
  const unit = unitInfo.wholesaleUnit || 'kg';

  // Derive candidate quantities strictly from the Admin source of truth
  const candidateQuantities = useMemo(() => {
    const authoritative = getAuthoritativeWholesaleTiers(product, pricingRules);
    if (authoritative.length > 0) return authoritative;
    // Fallback if no rules exist in database: single base catalog tier without inventing fake quantities
    return [unitInfo.minWholesaleQuantity || 1];
  }, [product, pricingRules, unitInfo]);

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
            <h3 className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider">
              Direct Bulk Buy
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#626c66] hidden sm:inline">
            Select tier to preview factory rates
          </span>
        </div>
        <div className="text-base sm:text-lg font-bold text-[#0f2d22] break-words">
          {product.name}
        </div>
      </div>

      {/* Slabs / Quantity Pills */}
      <div
        role="radiogroup"
        aria-label="Direct bulk buy volume options"
        className="flex flex-wrap gap-2 pt-1"
      >
        {candidateQuantities.map((q) => {
          const isSelected = selectedQuantity === q;

          return (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${q} ${unit}${isSelected ? ', currently selected' : ''}`}
              onClick={() => onSelectQuantity(q)}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#1b4332] text-[#c5a059] border-[#1b4332] shadow-xs ring-2 ring-[#1b4332]/30'
                  : 'bg-white text-[#0f2d22] border-[#e8e2d5] hover:border-[#1b4332]/50 hover:bg-[#FAF8F5]'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0 stroke-[2.5]" />}
              <span>
                {q} {unit}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
