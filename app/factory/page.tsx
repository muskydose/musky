import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { Factory, CheckCircle, Shield, Droplets, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { safeJsonLd } from '@/lib/utils';
import { isSafeInternalMediaUrl } from '@/lib/db/media';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/Motion';

export const revalidate = 60;

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'factory',
    targetUrl: '/factory',
    defaultTitle: 'Our Sojat Factory — Manufacturing & Quality Lab',
    defaultDescription: 'Explore our processing facility in Sojat City, Rajasthan. Learn about our ultra-fine cloth-sifting and lab testing standards.',
    defaultKeywords: ['Sojat Factory', 'Mehendi Processing', 'Ultra-Fine Sifted Henna Lab'],
  });
}

export default async function FactoryPage() {
  const siteSettings = await getSiteSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/factory#facility`,
    name: `${siteSettings.brandName || 'Musky Dose'} — Sojat Processing Plant`,
    description: siteSettings.factoryHeroSubtitle || 'Where traditional Rajasthani herbal expertise meets modern hygienic processing in Sojat City, Rajasthan.',
    image: siteSettings.factoryImageUrl && isSafeInternalMediaUrl(siteSettings.factoryImageUrl) ? (siteSettings.factoryImageUrl.startsWith('http') ? siteSettings.factoryImageUrl : `${baseUrl}${siteSettings.factoryImageUrl}`) : `${baseUrl}/logo.png`,
    url: `${baseUrl}/factory`,
    telephone: siteSettings.displayPhone || '+91 82337 03080',
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Village: Dholiwadi Ka Bas, Post: Sojat City',
      addressLocality: 'Sojat City',
      addressRegion: 'Rajasthan',
      postalCode: '306104',
      addressCountry: 'IN',
    },
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessLd) }}
      />
      <Navbar siteSettings={siteSettings} />

      <div className="bg-[#0f2d22] text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <FadeIn direction="down">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
              {siteSettings.factoryHeroEyebrow || 'STATE-OF-THE-ART PROCESSING'}
            </span>
            <h1 className="font-momo-display text-4xl sm:text-5xl font-normal text-white">
              {siteSettings.factoryHeroTitle || 'Our Sojat Factory & Lab'}
            </h1>
            <p className="text-sm sm:text-base text-[#b2c8be] leading-relaxed">
              {siteSettings.factoryHeroSubtitle || 'Where traditional Rajasthani herbal expertise meets modern hygienic processing.'}
            </p>
          </div>
        </FadeIn>
      </div>

      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 flex-1">
        <FadeIn direction="up">
          <div className="bg-white p-8 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-6">
            <h2 className="font-momo-display text-3xl font-normal text-[#0f2d22]">
              {siteSettings.factorySectionHeading || 'Hygienic Manufacturing & Processing Steps'}
            </h2>
            <p className="text-sm text-[#2b302c] leading-relaxed">
              {siteSettings.factoryStory ||
                'Located in Sojat City, Pali district, our plant handles solar drying, stainless steel micro-pulverizing, and ultra-fine cloth-sifting. Every batch is sealed in moisture-proof food grade pouches to preserve peak dye potency.'}
            </p>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4" staggerDelay={0.12}>
              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">1</span>
                  <span>{siteSettings.factoryStep1Title || 'Solar Shade Drying'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep1Description || 'Leaves are shade-dried under controlled solar chambers to protect chlorophyll and lawsone pigments from degradation.'}</p>
              </StaggerItem>

              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">2</span>
                  <span>{siteSettings.factoryStep2Title || 'Micro Pulverization'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep2Description || 'Heavy-duty food-grade stainless steel pulverizers grind leaves into uniform fine particles without heat buildup.'}</p>
              </StaggerItem>

              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">3</span>
                  <span>{siteSettings.factoryStep3Title || 'Ultra-Fine Cloth Sifting'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep3Description || 'Pulverized powder passes ultra-fine micro cloth filters to eliminate any stem fibers or coarse residue.'}</p>
              </StaggerItem>

              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">4</span>
                  <span>{siteSettings.factoryStep4Title || 'Vacuum Pouch Sealing'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep4Description || 'Packed in nitrogen-flushed, multi-layer aluminum barrier pouches to prevent moisture ingress and oxidation.'}</p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </FadeIn>

        {/* Navigation & Contextual Routing */}
        <FadeIn direction="up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/wholesale"
              className="p-6 rounded-2xl bg-[#0f2d22] text-white hover:bg-[#16382b] transition-all border border-[#2d6a4f] flex flex-col justify-between group shadow-xs"
            >
              <div>
                <span className="text-[#c5a059] text-[10px] font-bold uppercase tracking-widest block mb-2">B2B Supply</span>
                <h3 className="font-momo-display text-xl font-normal text-white group-hover:text-[#c5a059] transition-colors flex items-center gap-2">
                  Wholesale Mandi Rates <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="text-xs text-[#b2c8be] mt-2 leading-relaxed">
                  Bulk salon packs, commercial multi-wall sacks, and GST tax invoicing directly from our Sojat unit.
                </p>
              </div>
              <span className="text-[#c5a059] text-xs font-semibold mt-4 inline-flex items-center gap-1">
                Explore B2B Catalog &rarr;
              </span>
            </Link>

            <Link
              href="/sojat-henna"
              className="p-6 rounded-2xl bg-white text-[#0f2d22] hover:bg-[#faf8f5] transition-all border border-[#e8e2d5] flex flex-col justify-between group shadow-xs"
            >
              <div>
                <span className="text-[#88908a] text-[10px] font-bold uppercase tracking-widest block mb-2">Origin &amp; Terroir</span>
                <h3 className="font-momo-display text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors flex items-center gap-2">
                  Sojat Soil &amp; Climate <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="text-xs text-[#626c66] mt-2 leading-relaxed">
                  Why Pali district&apos;s arid climate and alkaline soil produce the world&apos;s highest natural lawsone dye content.
                </p>
              </div>
              <span className="text-[#1b4332] text-xs font-semibold mt-4 inline-flex items-center gap-1">
                Read Terroir Story &rarr;
              </span>
            </Link>

            <Link
              href="/products"
              className="p-6 rounded-2xl bg-white text-[#0f2d22] hover:bg-[#faf8f5] transition-all border border-[#e8e2d5] flex flex-col justify-between group shadow-xs"
            >
              <div>
                <span className="text-[#88908a] text-[10px] font-bold uppercase tracking-widest block mb-2">Pure Retail Batches</span>
                <h3 className="font-momo-display text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors flex items-center gap-2">
                  Finished Botanical Products <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="text-xs text-[#626c66] mt-2 leading-relaxed">
                  Browse our certified BAQ henna, indigo, amla, and botanical care powders packaged at source.
                </p>
              </div>
              <span className="text-[#1b4332] text-xs font-semibold mt-4 inline-flex items-center gap-1">
                Shop Botanical Collection &rarr;
              </span>
            </Link>
          </div>
        </FadeIn>
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
