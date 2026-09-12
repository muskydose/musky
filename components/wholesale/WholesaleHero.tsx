'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import PersonaSwitcher, { BuyerPersona, PERSONA_CONFIGS } from './PersonaSwitcher';
import { Building2, MapPin, Sparkles, ShieldCheck, Truck } from 'lucide-react';

interface WholesaleHeroProps {
  siteSettings?: SiteSettings | null;
  activePersona: BuyerPersona;
  onPersonaChange: (p: BuyerPersona) => void;
  isBulkMode?: boolean;
  onScrollToForm?: () => void;
  onScrollToCalculator?: () => void;
}

export default function WholesaleHero({
  siteSettings,
  activePersona,
  onPersonaChange,
  isBulkMode,
  onScrollToForm,
  onScrollToCalculator,
}: WholesaleHeroProps) {
  const currentPersona = PERSONA_CONFIGS[activePersona];

  const handleScrollToForm = () => {
    if (onScrollToForm) {
      onScrollToForm();
    } else if (typeof document !== 'undefined') {
      const el = document.getElementById('wholesale-inquiry-form');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToCalculator = () => {
    if (onScrollToCalculator) {
      onScrollToCalculator();
    } else if (typeof document !== 'undefined') {
      const el = document.getElementById('wholesale-calculator');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="bg-[#0f2d22] text-white pt-10 pb-12 px-4 relative overflow-hidden border-b border-[#2d6a4f]/50">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-[#1b4332]/40 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 text-center space-y-4">
        {/* Origin Badge */}
        <div className="inline-flex items-center justify-center flex-wrap gap-1.5 px-3 py-1.5 rounded-full bg-[#1b4332]/90 text-[#c5a059] border border-[#2d6a4f] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-xs max-w-full">
          <MapPin className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
          <span>Sojat Factory Direct Operation • Pincode: 306104</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </div>

        {/* Primary High-Impact B2B Headline */}
        <div className="space-y-1.5 max-w-3xl mx-auto">
          <h1 className="font-momo-display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-white leading-tight">
            Buy Direct. Scale With Confidence.
          </h1>
          <p className="text-xs sm:text-sm text-[#c5a059] font-medium tracking-wide">
            {currentPersona?.tagline || 'Direct factory supply from our Sojat, Rajasthan operation.'}
          </p>
        </div>

        {/* Supporting Copy */}
        <p className="text-xs sm:text-sm text-[#b2c8be] max-w-2xl mx-auto leading-relaxed">
          Wholesale botanical supply from our Sojat, Rajasthan operation for salons, mehndi professionals, resellers and bulk buyers. Fresh batch processing with verified B2B freight dispatch pan-India.
        </p>

        {/* Dual Primary & Secondary CTAs */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleScrollToForm}
            className="px-6 py-3 rounded-xl bg-[#c5a059] hover:bg-[#d4b068] text-[#0f2d22] font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer min-h-[44px]"
          >
            Get Wholesale Quote
          </button>
          <button
            type="button"
            onClick={handleScrollToCalculator}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer min-h-[44px]"
          >
            Calculate Bulk Price ↓
          </button>
        </div>

        {/* Buyer Persona Selector Switcher */}
        <div className="pt-3">
          <PersonaSwitcher
            activePersona={activePersona}
            onPersonaChange={onPersonaChange}
          />
        </div>

        {/* Compact Trust Highlights Strip */}
        <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left max-w-3xl mx-auto text-[11px] text-[#b2c8be]">
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="truncate">Sojat Factory</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
            <Building2 className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="truncate">Direct Factory Rates</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
            <Truck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="truncate">Pan-India Freight</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="truncate">GST Tax Invoices</span>
          </div>
        </div>
      </div>
    </section>
  );
}

