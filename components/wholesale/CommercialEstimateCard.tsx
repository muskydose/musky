'use client';

import React from 'react';
import { formatPrice, formatPercent } from '@/lib/utils';
import { CanonicalWholesaleResolution } from '@/lib/wholesale-pricing-resolver';
import { TrendingDown, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

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
  unitLabel,
  minWholesaleQuantity = 1,
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
  const isBelowMoq = quantity < minWholesaleQuantity;

  return (
    <div
      aria-live="polite"
      className="bg-white border-2 border-[#1b4332]/20 rounded-2xl p-4 sm:p-6 shadow-md space-y-4 relative overflow-hidden"
    >
      {/* Decorative top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1b4332] via-[#c5a059] to-[#1b4332]" />

      {/* Header & Status (Read-only Commercial Result) */}
      <div className="border-b border-[#e8e2d5] pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs font-extrabold text-[#c5a059] uppercase tracking-wider block">
            Live Commercial Estimate
          </span>
          {/* MOQ / Tier Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
              isBelowMoq
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : isCustomQuote
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : hasConfiguredTier
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-[#FAF8F5] text-[#626c66] border border-[#e8e2d5]'
            }`}
          >
            {isBelowMoq ? (
              <>
                <AlertCircle className="w-3 h-3 text-rose-600" /> Below MOQ (Min: {minWholesaleQuantity} {unit})
              </>
            ) : isCustomQuote ? (
              <>
                <AlertCircle className="w-3 h-3 text-amber-700" /> Custom High-Volume Rate
              </>
            ) : hasConfiguredTier ? (
              <>
                <Sparkles className="w-3 h-3 text-emerald-700" /> Tier Unlocked ({formatPercent(savingsPercent)} Off)
              </>
            ) : (
              <>Factory Catalog Base</>
            )}
          </span>
        </div>
      </div>

      {/* Centerpiece Rate Display */}
      <div className="bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl p-4 space-y-2 text-center relative">
        <div className="text-[11px] font-semibold text-[#626c66] uppercase tracking-wider">
          Effective Factory Wholesale Rate
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#1b4332] tracking-tight">
            {formatPrice(effectiveWholesaleRate)}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#626c66]">
            / {unit}
          </span>
          {hasConfiguredTier && (
            <span className="text-xs font-semibold text-[#88908a] line-through ml-1.5">
              {formatPrice(baseWholesaleRate)}/{unit}
            </span>
          )}
        </div>

        {/* High-Impact Savings Showcase */}
        {savingsAmount > 0 && (
          <div className="pt-1.5 border-t border-[#e8e2d5]">
            <div className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>You Save {formatPrice(savingsAmount)}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-0.5">
                {formatPercent(savingsPercent)} OFF
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Commercial Value Comparison Grid */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-white border border-[#e8e2d5] space-y-0.5">
          <span className="text-[10px] font-bold text-[#88908a] uppercase tracking-wider block">
            Catalog Value
          </span>
          <div className="font-mono text-sm font-semibold text-gray-500 line-through">
            {formatPrice(regularTotal)}
          </div>
          <span className="text-[10px] text-[#88908a] block">Retail packaging rate</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-0.5">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Estimated Order Total
          </span>
          <div className="font-mono text-base font-extrabold text-[#0f2d22]">
            ~{formatPrice(effectiveTotal)}
          </div>
          <span className="text-[10px] text-emerald-700 block font-medium">Ex-factory Sojat</span>
        </div>
      </div>

      {/* High Volume Custom Mandi Notice */}
      {isCustomQuote && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Dedicated High-Volume Tier:</strong> For orders exceeding standard volume tiers, our Sojat factory desk provides mandi-linked commercial freight terms.
          </span>
        </div>
      )}

      {/* Non-binding Estimate Notice */}
      <div className="text-[11px] text-[#626c66] flex items-center gap-1.5 pt-0.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
        <span>Non-binding estimate. Freight & applicable GST confirmed upon final dispatch review.</span>
      </div>

      {/* Action Button: Single Primary Conversion CTA */}
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
