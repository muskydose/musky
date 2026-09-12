'use client';

import React from 'react';
import { formatPrice, formatPercent } from '@/lib/utils';
import { CanonicalWholesaleResolution } from '@/lib/wholesale-pricing-resolver';
import { TrendingDown, ShieldCheck, ArrowDownCircle, MessageCircle, AlertCircle, Sparkles, Minus, Plus } from 'lucide-react';

interface CommercialEstimateCardProps {
  pricingResult: CanonicalWholesaleResolution;
  productName: string;
  quantity: number;
  unitLabel: string;
  minWholesaleQuantity?: number;
  pricingUnit?: string;
  onApplyToForm: () => void;
  onDirectWhatsApp: () => void;
  ctaLabel?: string;
  onQuantityChange?: (qty: number) => void;
  presetQuantities?: number[];
}

export default function CommercialEstimateCard({
  pricingResult,
  productName,
  quantity,
  unitLabel,
  minWholesaleQuantity = 1,
  onApplyToForm,
  onDirectWhatsApp,
  ctaLabel = 'Lock Estimate & Populate Form Below ↓',
  onQuantityChange,
  presetQuantities,
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
    hasConfiguredTier,
    unit,
  } = pricingResult;

  const isCustomQuote = status === 'CUSTOM_QUOTE';
  const isBelowMoq = quantity < minWholesaleQuantity;

  const handleDecrement = () => {
    if (!onQuantityChange) return;
    onQuantityChange(Math.max(1, quantity - 1));
  };

  const handleIncrement = () => {
    if (!onQuantityChange) return;
    onQuantityChange(quantity + 1);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onQuantityChange) return;
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onQuantityChange(1);
    } else {
      onQuantityChange(Math.max(1, val));
    }
  };

  return (
    <div
      aria-live="polite"
      className="bg-white border-2 border-[#1b4332]/20 rounded-2xl p-4 sm:p-6 shadow-md space-y-4 relative overflow-hidden"
    >
      {/* Decorative top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1b4332] via-[#c5a059] to-[#1b4332]" />

      {/* Header & Product Summary */}
      <div className="border-b border-[#e8e2d5] pb-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold text-[#c5a059] uppercase tracking-wider block">
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

        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-momo-display text-lg sm:text-xl font-normal text-[#0f2d22] truncate max-w-[260px]">
            {productName}
          </h3>
          <span className="text-xs font-mono font-bold text-[#1b4332] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#e8e2d5]">
            {quantity} {unit}
          </span>
        </div>
      </div>

      {/* Interactive Order Volume Selection */}
      {onQuantityChange && (
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor="estimate-qty-input" className="font-bold text-[#0f2d22] uppercase tracking-wider">
              Order Volume
            </label>
            <span className="text-[#626c66] font-medium">
              Packaging Unit: <strong className="text-[#0f2d22]">{unit}</strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Stepper Controls */}
            <div className="inline-flex items-center justify-between rounded-lg border border-[#e8e2d5] bg-white p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                aria-label={`Decrease volume by 1 ${unit}`}
                className="w-8 h-8 rounded flex items-center justify-center text-[#0f2d22] hover:bg-[#FAF8F5] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-center px-1.5">
                <input
                  id="estimate-qty-input"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={handleManualInput}
                  aria-label={`Order quantity in ${unit}`}
                  className="w-14 text-center font-mono font-bold text-sm text-[#0f2d22] bg-transparent focus:outline-none"
                />
                <span className="text-xs font-semibold text-[#626c66] ml-0.5 select-none">
                  {unit}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                aria-label={`Increase volume by 1 ${unit}`}
                className="w-8 h-8 rounded flex items-center justify-center text-[#0f2d22] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets */}
            {presetQuantities && presetQuantities.length > 0 && (
              <div
                role="group"
                aria-label="Quick volume presets"
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none flex-1"
              >
                {presetQuantities.map((preset) => {
                  const isSelected = quantity === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onQuantityChange(preset)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all min-h-[34px] shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#1b4332] text-[#c5a059] shadow-xs ring-1 ring-[#1b4332]'
                          : 'bg-white text-[#0f2d22] border border-[#e8e2d5] hover:bg-gray-50'
                      }`}
                    >
                      {preset} {unit}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Action Buttons */}
      <div className="pt-1 space-y-2">
        <button
          type="button"
          onClick={onApplyToForm}
          className="w-full py-3 px-4 rounded-xl bg-[#0f2d22] hover:bg-[#1b4332] text-[#c5a059] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer min-h-[44px]"
        >
          <ArrowDownCircle className="w-4 h-4 text-[#c5a059]" />
          <span>{ctaLabel}</span>
        </button>

        <button
          type="button"
          onClick={onDirectWhatsApp}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer min-h-[40px]"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp Factory Desk</span>
        </button>
      </div>
    </div>
  );
}

