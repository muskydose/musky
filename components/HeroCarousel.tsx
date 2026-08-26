'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Leaf,
  Factory,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import BrandLogo from '@/components/BrandLogo';
import { sanitizeImageUrl } from '@/lib/utils';

interface HeroCarouselProps {
  siteSettings: SiteSettings;
  whatsappUrl?: string;
}

export default function HeroCarousel({ siteSettings }: HeroCarouselProps) {
  const cms = getCmsText(siteSettings);
  const eyebrow = siteSettings.heroEyebrow || cms.heroEyebrow || 'SOJAT ORIGIN • 100% NATURAL';
  const title = siteSettings.heroTitle || cms.heroTitle || 'Authentic 100% Pure Sojat Henna & Natural Herbal Care';
  const subtitle = siteSettings.heroSubtitle || cms.heroSubtitle || 'Freshly processed and sourced directly from Sojat, Rajasthan. Authentic cloth-sifted mehendi powder and traditional botanical remedies.';
  const primaryCtaText = siteSettings.heroPrimaryCtaText || cms.heroPrimaryCtaText || 'SHOP PRODUCTS';
  const primaryCtaLink = siteSettings.heroPrimaryCtaLink || '/products';
  const secondaryCtaText = siteSettings.heroSecondaryCtaText || cms.heroSecondaryCtaText || 'EXPLORE CATEGORIES';
  const secondaryCtaLink = siteSettings.heroSecondaryCtaLink || '/categories';
  const imageUrl = siteSettings.heroImageUrl || '/images/fallback.svg';

  return (
    <section className="relative bg-gradient-to-b from-[#0a1f17] via-[#0f2d22] to-[#13382b] text-[#faf5e8] hero-responsive-section pt-4 pb-8 sm:pt-10 sm:pb-14 px-3 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Subtle Decorative Accents */}
      <div className="absolute -top-32 -right-32 w-80 sm:w-96 h-80 sm:h-96 rounded-full border border-[#c5a059]/15 pointer-events-none blur-3xs" />
      <div className="absolute top-1/2 -left-28 w-64 sm:w-80 h-64 sm:h-80 rounded-full border border-[#c5a059]/10 pointer-events-none blur-3xs" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Content Column */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-5 text-center lg:text-left">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#1b4332]/90 border border-[#c5a059]/35 text-[#c5a059] px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#c5a059]" />
              <span>{eyebrow}</span>
            </div>

            {/* Title */}
            <h1 className="font-momo-display hero-responsive-title text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-normal tracking-tight text-white leading-tight sm:leading-[1.15]">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-[#c5d4cc] leading-normal sm:leading-relaxed max-w-2xl mx-auto lg:mx-0 font-sans">
              {subtitle}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-4 w-full">
              {/* Primary CTA: Shop Products */}
              <Link
                href={primaryCtaLink}
                className="w-full sm:w-auto min-h-[42px] sm:min-h-[48px] inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span>{primaryCtaText}</span>
              </Link>

              {/* Secondary CTA: Explore Categories */}
              {secondaryCtaText && (
                <Link
                  href={secondaryCtaLink}
                  className="w-full sm:w-auto min-h-[42px] sm:min-h-[48px] inline-flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#143326] text-[#faf5e8] border border-[#c5a059]/40 px-5 py-3 sm:px-7 sm:py-4 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>{secondaryCtaText}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c5a059]" />
                </Link>
              )}
            </div>
          </div>

          {/* Right Image Feature Card */}
          <div className="lg:col-span-5 relative mt-2 lg:mt-0">
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none rounded-2xl overflow-hidden border border-[#c5a059]/35 shadow-2xl bg-[#1b4332] aspect-[16/10] sm:aspect-[16/11] lg:aspect-[4/5] p-2.5 sm:p-3">
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <Image
                  src={sanitizeImageUrl(imageUrl)}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover brightness-95 hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2d22] via-transparent to-transparent p-4 sm:p-5 flex flex-col justify-end text-white">
                  <div className="bg-[#0f2d22]/90 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-[#c5a059]/30 shadow-md">
                    <div className="flex items-center gap-2 mb-1">
                      <BrandLogo logoUrl={siteSettings.logoUrl} size="sm" className="bg-white/95 px-1.5 py-0.5 rounded-lg shadow-2xs" />
                      <span className="text-[10px] text-[#c5a059] font-bold uppercase tracking-widest">Sojat Rajasthan</span>
                    </div>
                    <h3 className="font-momo-display text-sm sm:text-base font-normal text-white line-clamp-1">
                      {title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-[#b8c9c0] mt-0.5 line-clamp-2 leading-snug">
                      {subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heritage Highlights Bar */}
        <div className="mt-6 pt-5 sm:pt-6 border-t border-[#1b4332]/60 grid grid-cols-3 gap-2 sm:gap-4 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-1.5 lg:gap-2.5">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#c5a059] shrink-0 hidden lg:block" />
            <div>
              <div className="font-momo-display text-xs sm:text-base font-normal text-white leading-tight">Sojat Origin</div>
              <div className="text-[9px] sm:text-xs text-[#9bb3a6] leading-snug">Pali, Rajasthan, India</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-1.5 lg:gap-2.5">
            <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-[#c5a059] shrink-0 hidden lg:block" />
            <div>
              <div className="font-momo-display text-xs sm:text-base font-normal text-[#c5a059] leading-tight">Ultra-Fine Sifted</div>
              <div className="text-[9px] sm:text-xs text-[#9bb3a6] leading-snug">Micro-Fine Silky Powder</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-1.5 lg:gap-2.5">
            <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-[#c5a059] shrink-0 hidden lg:block" />
            <div>
              <div className="font-momo-display text-xs sm:text-base font-normal text-white leading-tight">100% Plant Based</div>
              <div className="text-[9px] sm:text-xs text-[#9bb3a6] leading-snug">Chemical & PPD Free</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

