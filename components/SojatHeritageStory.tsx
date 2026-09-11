import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Leaf, ShieldCheck, Sparkles, Truck, ArrowRight, MapPin, CheckCircle2 } from 'lucide-react';
import { SiteSettings, HomepageSectionConfig } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';

interface SojatHeritageStoryProps {
  section: HomepageSectionConfig;
  siteSettings: SiteSettings;
}

export default function SojatHeritageStory({ section, siteSettings }: SojatHeritageStoryProps) {
  const rawImage = siteSettings.factoryImageUrl || siteSettings.aboutImageUrl || '';
  const isCustomImage = Boolean(rawImage && !rawImage.endsWith('.svg') && !rawImage.includes('fallback.svg'));

  // Authoritative CMS / repository-backed fields with strict claim-safe fallbacks
  const eyebrow = section.subheading || siteSettings.aboutHeroEyebrow || 'OUR SOJAT HERITAGE';
  const heading = section.heading || siteSettings.aboutSectionHeading || 'From Sojat, Rajasthan — The Henna Capital';

  // Editorial storytelling connecting Origin -> Process -> Trust (100% repository-backed)
  const paragraph1 = siteSettings.aboutParagraph2 ||
    'Sojat’s unique arid soil and climate naturally produce henna leaves containing high concentrations of Lawsone (the natural red-orange pigment). We harvest leaves at peak maturity and micro-cloth filter them to produce silk-smooth powders loved by brides and artists worldwide.';

  const paragraph2 = siteSettings.factoryStory ||
    'Located in Sojat City, Pali district, our plant handles solar drying, stainless steel micro-pulverizing, and ultra-fine cloth-sifting. Every batch is sealed in moisture-proof food grade pouches to preserve peak dye potency.';

  const pillars = [
    {
      id: 'purity',
      icon: <ShieldCheck className="w-4 h-4 text-[#c5a059]" />,
      title: siteSettings.aboutPillar1Title || 'Zero Adulteration',
      desc: siteSettings.aboutPillar1Description || 'No synthetic dyes, sodium picramate, or metallic salts.',
    },
    {
      id: 'sifting',
      icon: <Sparkles className="w-4 h-4 text-[#c5a059]" />,
      title: siteSettings.aboutPillar2Title || 'Triple Cloth Sifted',
      desc: siteSettings.aboutPillar2Description || 'Ultra-fine sifting for smooth paste and clog-free cone flow.',
    },
    {
      id: 'origin',
      icon: <Truck className="w-4 h-4 text-[#c5a059]" />,
      title: siteSettings.aboutPillar3Title || 'Direct Sojat Dispatch',
      desc: siteSettings.aboutPillar3Description || 'Harvested and packaged at source in Pali district, Rajasthan.',
    },
  ];

  return (
    <section className="py-8 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="bg-[#0f2d22] text-white rounded-3xl overflow-hidden shadow-2xl border border-[#2d6a4f]/40 grid grid-cols-1 lg:grid-cols-12 relative">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1b4332]/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Narrative Column */}
        <div className="lg:col-span-7 p-5 sm:p-10 lg:p-12 flex flex-col justify-between relative z-10 space-y-5 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Origin Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b4332] border border-[#c5a059]/30 text-[#c5a059] text-[11px] font-bold uppercase tracking-widest font-sans">
              <Leaf className="w-3.5 h-3.5" />
              <span>{eyebrow}</span>
            </div>

            {/* Heading */}
            <h2 className="font-momo-display text-2xl sm:text-3xl lg:text-4xl font-normal text-white leading-tight">
              {heading}
            </h2>

            {/* Editorial Narrative */}
            <div className="space-y-3 text-xs sm:text-sm text-[#b2c8be] leading-relaxed font-sans">
              <p>{paragraph1}</p>
              <p>{paragraph2}</p>
            </div>
          </div>

          {/* 3 Heritage Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2">
            {pillars.map((pillar) => (
              <div
                key={pillar.id}
                className="bg-[#1b4332]/70 border border-[#2d6a4f]/50 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-start space-y-1.5 backdrop-blur-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0f2d22] border border-[#c5a059]/30 flex items-center justify-center shrink-0">
                    {pillar.icon}
                  </div>
                  <span className="font-bold text-xs text-white leading-snug font-sans">
                    {pillar.title}
                  </span>
                </div>
                <p className="text-[11px] text-[#8fa89b] leading-tight font-sans">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 font-sans">
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] px-6 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md hover:scale-105 active:scale-95 shrink-0"
            >
              <span>Discover Our Heritage</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products?category=henna"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#d3e2da] hover:text-[#c5a059] border-b border-[#c5a059]/40 hover:border-[#c5a059] pb-0.5 transition-colors shrink-0"
            >
              <span>Explore Pure Henna Range</span>
              <ArrowRight className="w-3 h-3 text-[#c5a059]" />
            </Link>
          </div>
        </div>

        {/* Visual / Verification Column */}
        <div className="lg:col-span-5 relative min-h-[260px] sm:min-h-[320px] lg:min-h-full overflow-hidden border-t lg:border-t-0 lg:border-l border-[#2d6a4f]/40 flex items-center justify-center font-sans">
          {isCustomImage ? (
            <div className="relative w-full h-full min-h-[260px]">
              <Image
                src={sanitizeImageUrl(rawImage)}
                alt="Sojat Rajasthan Henna Processing Facility"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2d22]/90 via-[#0f2d22]/30 to-transparent flex flex-col justify-end p-5 sm:p-6">
                <div className="inline-flex items-center gap-1.5 bg-[#0f2d22]/80 backdrop-blur-xs border border-[#c5a059]/40 rounded-full px-3 py-1 text-[11px] font-bold text-[#c5a059] self-start mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Sojat City, Pali District, Rajasthan</span>
                </div>
                <p className="text-xs text-[#d3e2da] font-serif italic">
                  &ldquo;Rooted in Rajasthan — preserving the authentic purity of natural henna.&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-[#1b4332] via-[#0f2d22] to-[#0a1f17] relative">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-xs border border-[#c5a059]/40 rounded-full px-3 py-1 text-[11px] font-bold text-[#c5a059]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>25.92° N, 73.66° E • Sojat, Rajasthan</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
                    Authentic Sourcing Guarantee
                  </span>
                  <p className="text-xs sm:text-sm text-[#d3e2da] font-serif italic leading-relaxed">
                    &ldquo;Musky Dose was founded with a singular objective: to deliver pure, farm-fresh Lawsonia Inermis directly from Sojat to your doorstep.&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#8fa89b]">
                <div className="flex items-center gap-1.5 text-[#c5a059] font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Sourced at Origin</span>
                </div>
                <span>Pali District, India</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
