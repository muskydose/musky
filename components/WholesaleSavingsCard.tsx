'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Product, BulkPricingRule } from '@/lib/types';
import { deriveWholesaleSavings, WholesaleSavingsResult } from '@/lib/wholesale-savings';
import { resolveProductWholesaleUnits } from '@/lib/wholesale-units';
import { Sparkles, TrendingDown, ArrowRight, ShieldCheck, CheckCircle2, Package, HelpCircle } from 'lucide-react';

interface WholesaleSavingsCardProps {
  product: Product;
  bulkRules?: BulkPricingRule[];
  initialQuantity?: number;
  showQuantityControls?: boolean;
  className?: string;
  onSelectQuote?: (savings: WholesaleSavingsResult) => void;
}

export default function WholesaleSavingsCard({
  product,
  bulkRules = [],
  initialQuantity,
  showQuantityControls = true,
  className = '',
  onSelectQuote,
}: WholesaleSavingsCardProps) {
  const units = useMemo(() => resolveProductWholesaleUnits(product), [product]);
  const minQty = units.minWholesaleQuantity || 1;

  const [quantity, setQuantity] = useState<number>(initialQuantity || minQty);

  // Derive live savings strictly through canonical engine
  const savings = useMemo(() => {
    return deriveWholesaleSavings({
      product,
      quantity,
      rules: bulkRules,
      units,
      indicativeDiscountPercent: bulkRules.length === 0 ? 15 : undefined,
    });
  }, [product, quantity, bulkRules, units]);

  const isConfirmed = savings.isConfirmed;
  const isIndicative = savings.source === 'INDICATIVE';
  const hasSavings = savings.savingsAmount > 0;

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        isConfirmed
          ? 'border-[#c5a059]/40 bg-gradient-to-b from-[#FAF8F5] to-[#f4efe4] shadow-xs'
          : 'border-[#e8e2d5] bg-[#FAF8F5] shadow-2xs'
      } ${className}`}
    >
      {/* Header Banner */}
      <div className="bg-[#0f2d22] px-4 py-3 text-white flex items-center justify-between gap-2 border-b border-[#c5a059]/20">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-[#1b4332] text-[#c5a059]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wide uppercase text-[#faf5e8]">
              {isConfirmed
                ? 'Wholesale Benefit & Savings'
                : 'Bulk Sourcing Value'}
            </h4>
            <p className="text-[10px] text-[#c5a059]">
              Direct from Sojat Factory • 100% Verified Botanical
            </p>
          </div>
        </div>

        {isConfirmed ? (
          <span className="inline-flex items-center gap-1 bg-[#1b4332] text-[#c5a059] border border-[#c5a059]/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Verified Bulk Tier
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Indicative Preview
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {/* Quantity Toggle / Presets */}
        {showQuantityControls && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0f2d22] uppercase tracking-wider text-[11px]">
                Compare Bulk Quantity:
              </span>
              <span className="text-[11px] font-mono font-medium text-gray-600">
                {savings.display.equivalentPackagesLabel}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {units.presetQuantities.slice(0, 5).map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    quantity === qty
                      ? 'bg-[#1b4332] text-[#c5a059] shadow-2xs scale-[1.02]'
                      : 'bg-white text-gray-700 border border-[#e8e2d5] hover:bg-[#e8f3ed]'
                  }`}
                >
                  {qty} {units.wholesaleUnit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rate Comparison Card */}
        <div className="rounded-xl border border-[#e8e2d5] bg-white p-3.5 space-y-2.5 shadow-2xs">
          {/* Row 1: Retail Equivalent */}
          <div className="flex items-baseline justify-between text-xs border-b border-gray-100 pb-2">
            <span className="text-gray-500 font-medium">
              Normal Retail Value:
            </span>
            <div className="text-right font-mono">
              <span className="text-sm font-semibold text-gray-600 line-through">
                {savings.display.formattedRetailRate}
              </span>
              <span className="block text-[10px] text-gray-400">
                (Total: {savings.display.formattedRetailTotal} for {quantity} {units.wholesaleUnit})
              </span>
            </div>
          </div>

          {/* Row 2: Wholesale Rate */}
          <div className="flex items-baseline justify-between text-xs border-b border-gray-100 pb-2">
            <span className="text-[#0f2d22] font-bold">
              Wholesale Sourcing Rate:
            </span>
            <div className="text-right font-mono">
              <span className="text-base font-extrabold text-[#1b4332]">
                {savings.display.formattedWholesaleRate}
              </span>
              <span className="block text-[10px] font-bold text-[#1b4332]">
                (Total: {savings.display.formattedWholesaleTotal} for {quantity} {units.wholesaleUnit})
              </span>
            </div>
          </div>

          {/* Row 3: Live Benefit / Savings Highlight */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-emerald-800">
                You Save:
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                {hasSavings ? `${savings.display.formattedSavingsTotal} (${savings.display.formattedSavingsPercent} OFF)` : 'Custom Factory Quote'}
              </span>
            </div>
          </div>
        </div>

        {/* Indicative Disclaimer if preview */}
        {isIndicative && (
          <div className="flex items-start gap-1.5 text-[10px] text-gray-500 leading-snug bg-amber-50/70 p-2 rounded-lg border border-amber-200/50">
            <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Indicative tier preview based on bulk volume. Final wholesale rates and custom GST billing confirmed upon quote generation.
            </span>
          </div>
        )}

        {/* CTA Button */}
        <div>
          {onSelectQuote ? (
            <button
              type="button"
              onClick={() => onSelectQuote(savings)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1b4332] hover:bg-[#0f2d22] text-[#faf5e8] hover:text-[#c5a059] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span>Get Wholesale Quote for {quantity} {units.wholesaleUnit}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href={`/wholesale?product=${encodeURIComponent(product.id)}&qty=${quantity}`}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1b4332] hover:bg-[#0f2d22] text-[#faf5e8] hover:text-[#c5a059] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <span>Explore Bulk / Wholesale Rates &rarr;</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

