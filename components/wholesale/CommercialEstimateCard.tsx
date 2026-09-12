'use client';

import React from 'react';
import { formatPrice, formatPercent } from '@/lib/utils';
import { CanonicalWholesaleResolution } from '@/lib/wholesale-pricing-resolver';
import { TrendingDown, ShieldCheck, ArrowDownCircle, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';

interface CommercialEstimateCardProps {
  pricingResult: CanonicalWholesaleResolution;
  productName: string;
  quantity: number;
  unitLabel: string;
  pricingUnit: string;
  onApplyToForm: () => void;
  onDirectWhatsApp: () => void;
  ctaLabel?: string;
}

export default function CommercialEstimateCard({
  pricingResult,
  productName,
  quantity,
  unitLabel,
  pricingUnit,
  onApplyToForm,
  onDirectWhatsApp,
  ctaLabel = 'Lock Estimate & Populate Form Below ↓',
}: CommercialEstimateCardProps) {
  const {
    baseWholesaleRate,
    effectiveWholesaleRate,
    regularTotal,
    effectiveTotal,
    savingsAmount,
    savingsPercent,
    tierName,
    status,
  } = pricingResult;

  const isCustomQuote = status === 'CUSTOM_QUOTE';

  return (
    <div
      aria-live="polite"
      className="bg-white border border-[#e8e2d5] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden"
    >
      {/* Decorative accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1b4332] via-[#c5a059] to-[#1b4332]" />

      {/* Header & Tier Status */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e8e2d5] pb-3">
        <div>
          <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
            Commercial Volume Estimate
          </span>
          <h3 className="font-momo-display text-lg font-normal text-[#0f2d22] truncate max-w-[240px]">
            {productName}
          </h3>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isCustomQuote
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isCustomQuote ? (
              <>
                <AlertCircle className="w-3 h-3" /> Custom Volume Rate
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-[#c5a059]" /> {tierName || 'Wholesale Tier'}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Unit Rates */}
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-1">
          <div className="text-[#626c66] text-[11px]">Catalog Retail Rate</div>
          <div className="text-sm font-semibold text-[#88908a] line-through">
            {formatPrice(baseWholesaleRate)}
            <span className="text-[10px] font-normal text-[#88908a]"> / {pricingUnit}</span>
          </div>
          <div className="text-[#0f2d22] text-[11px] pt-1 font-medium">Factory Wholesale Rate</div>
          <div className="text-base font-mono font-bold text-[#1b4332]">
            {formatPrice(effectiveWholesaleRate)}
            <span className="text-xs font-normal text-[#626c66]"> / {pricingUnit}</span>
          </div>
        </div>

        {/* Totals & Savings */}
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-1">
          <div className="text-[#626c66] text-[11px]">Estimated Order Value</div>
          <div className="text-base font-mono font-bold text-[#0f2d22]">
            ~{formatPrice(effectiveTotal)}
          </div>

          {savingsAmount > 0 ? (
            <div className="pt-1">
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>Save {formatPrice(savingsAmount)}</span>
              </div>
              <div className="text-[10px] font-semibold text-emerald-600">
                ({formatPercent(savingsPercent)} commercial benefit)
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[#626c66] pt-1">Standard factory baseline</div>
          )}
        </div>
      </div>

      {/* High Volume Notice if Custom Quote */}
      {isCustomQuote && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Dedicated High-Volume Tier:</strong> For orders over 100 {unitLabel}, our Sojat factory desk provides tailored freight contracts and mandi-linked bulk rates.
          </span>
        </div>
      )}

      {/* Non-binding Estimate Notice */}
      <div className="text-[11px] text-[#626c66] flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
        <span>Non-binding estimate. Freight & applicable taxes confirmed upon final order review.</span>
      </div>

      {/* Action Buttons */}
      <div className="pt-1 space-y-2">
        <button
          type="button"
          onClick={onApplyToForm}
          className="w-full py-3 px-4 rounded-xl bg-[#0f2d22] hover:bg-[#1b4332] text-[#c5a059] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer min-h-[44px]"
        >
          <ArrowDownCircle className="w-4 h-4 text-[#c5a059]" />
          <span>{ctaLabel}</span>
        </button>

        <button
          type="button"
          onClick={onDirectWhatsApp}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer min-h-[40px]"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Request Quote via WhatsApp</span>
        </button>
      </div>
    </div>
  );
}

