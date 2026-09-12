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
}

export default function WholesaleHero({
  siteSettings,
  activePersona,
  onPersonaChange,
  isBulkMode,
}: WholesaleHeroProps) {
  const currentPersona = PERSONA_CONFIGS[activePersona];

  return (
    <section className="bg-[#0f2d22] text-white pt-10 pb-12 px-4 relative overflow-hidden border-b border-[#2d6a4f]/50">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-[#1b4332]/40 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 text-center space-y-4">
        {/* Origin Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b4332] text-[#c5a059] border border-[#2d6a4f] text-[11px] font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>Sojat City Factory Direct Sourcing • Pincode: 306104</span>
        </div>

        {/* Dynamic Heading */}
        <h1 className="font-momo-display text-2xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white max-w-3xl mx-auto leading-tight">
          {isBulkMode
            ? 'Commercial Sacks & Custom Botanical Packs Direct From Sojat'
            : siteSettings?.wholesaleHeroTitle || 'Wholesale & Commercial Botanical Supply Direct From Sojat Mills'}
        </h1>

        {/* Dynamic Subtitle */}
        <p className="text-xs sm:text-sm text-[#b2c8be] max-w-2xl mx-auto leading-relaxed">
          {isBulkMode
            ? 'Order custom commercial weight packs (5kg to 100kg+), raw sifted powders, pure botanical extracts, and ready applicators with direct factory logistics.'
            : siteSettings?.wholesaleHeroSubtitle || 'Direct factory partner for salons, bridal mehndi artists, natural cosmetics retailers, and bulk commercial distributors across India.'}
        </p>

        {/* Buyer Persona Selector Switcher */}
        <div className="pt-2">
          <PersonaSwitcher
            activePersona={activePersona}
            onPersonaChange={onPersonaChange}
          />
        </div>

        {/* Compact Trust Highlights Strip */}
        <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left max-w-3xl mx-auto text-[11px] text-[#b2c8be]">
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="truncate">100% Pure Botanicals</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
            <Building2 className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="truncate">Direct Mill Rates</span>
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

