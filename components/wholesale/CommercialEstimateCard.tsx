'use client';

import React from 'react';
import { formatPrice, formatPercent } from '@/lib/utils';
import { CanonicalWholesaleResolution } from '@/lib/wholesale-pricing-resolver';
import { TrendingDown, ShieldCheck, AlertCircle } from 'lucide-react';

interface CommercialEstimateCardProps {
  pricingResult: CanonicalWholesaleResolution;
  quantity: number;
  unitLabel: string;
  minWholesaleQuantity?: number;
  pricingUnit?: string;
  productName?: string;
  onApplyToForm: () => void;
  onDirectWhatsApp?: () => void;
  ctaLabel?: string;
}

export default function CommercialEstimateCard({
  pricingResult,
  quantity,
  onApplyToForm,
}: CommercialEstimateCardProps) {
  const {
    baseWholesaleRate,
    effectiveWholesaleRate,
    regularTotal,
    effectiveTotal,
    savingsAmount,
    savingsPercent,
    status,
    hasConfiguredTier,
    unit,
  } = pricingResult;

  const isCustomQuote = status === 'CUSTOM_QUOTE';

  return (
    <div aria-live="polite" className="space-y-4 pt-1">
      {/* 1. Commercial Rate Summary */}
      <div className="bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl p-4 sm:p-5 space-y-2 text-center">
        <div className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">
          Effective Factory Wholesale Rate
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#1b4332] tracking-tight">
            {formatPrice(effectiveWholesaleRate)}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#626c66]">
            / {unit}
          </span>
          {hasConfiguredTier && effectiveWholesaleRate < baseWholesaleRate && (
            <span className="text-xs font-semibold text-[#88908a] line-through ml-1.5">
              {formatPrice(baseWholesaleRate)}/{unit}
            </span>
          )}
        </div>

        {/* Savings Badge */}
        {savingsAmount > 0 && (
          <div className="pt-1.5 border-t border-[#e8e2d5]/70 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>You Save {formatPrice(savingsAmount)}</span>
              <span className="text-emerald-200">·</span>
              <span>{formatPercent(savingsPercent)} OFF</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Compact Value Cards (CATALOG VALUE & EX-FACTORY VALUE) */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Card 1: CATALOG VALUE */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-[#e8e2d5] space-y-1 text-center">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#88908a] uppercase tracking-wider block">
            Catalog Value
          </span>
          <div className="font-mono text-sm sm:text-base font-semibold text-gray-500 line-through">
            {formatPrice(regularTotal)}
          </div>
        </div>

        {/* Card 2: EX-FACTORY VALUE */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1 text-center">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Ex-Factory Value
          </span>
          <div className="font-mono text-base sm:text-lg font-extrabold text-[#0f2d22]">
            ~{formatPrice(effectiveTotal)}
          </div>
        </div>
      </div>

      {/* 3. High Volume Custom Mandi Notice (if applicable) */}
      {isCustomQuote && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Dedicated High-Volume Tier:</strong> For orders exceeding standard volume tiers, our Sojat factory desk provides mandi-linked commercial freight terms.
          </span>
        </div>
      )}

      {/* 4. Non-binding Estimate Notice */}
      <div className="text-[11px] text-[#626c66] flex items-center justify-center gap-1.5 pt-0.5 text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
        <span>Non-binding estimate. Freight &amp; applicable GST confirmed upon final dispatch review.</span>
      </div>

      {/* 5. Single Primary Conversion CTA */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onApplyToForm}
          className="w-full py-3.5 px-4 rounded-xl bg-[#0f2d22] hover:bg-[#1b4332] text-[#c5a059] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer min-h-[48px]"
        >
          <span>Get Wholesale Quote for {quantity} {unit} →</span>
        </button>
      </div>
    </div>
  );
}
