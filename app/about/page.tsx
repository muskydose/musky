import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { Leaf, ShieldCheck, Award, Heart, MapPin, CheckCircle } from 'lucide-react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { sanitizeImageUrl, safeJsonLd } from '@/lib/utils';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/Motion';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'about',
    targetUrl: '/about',
    defaultTitle: 'About Us — Sojat Henna Heritage',
    defaultDescription: 'Learn about Musky Dose, our family farms in Sojat, Rajasthan, and our commitment to pure, natural, plant-based henna.',
    defaultKeywords: ['About Musky Dose', 'Sojat Henna Heritage', 'Natural Mehendi Farms'],
  });
}

export default async function AboutPage() {
  const siteSettings = await getSiteSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/#localbusiness`,
    name: siteSettings.brandName || 'Musky Dose',
    description: siteSettings.aboutHeroSubtitle || 'Delivering authentic, highest-pigment Henna & pure Indian herbal wellness directly from Sojat, Rajasthan.',
    image: siteSettings.heroImageUrl ? (siteSettings.heroImageUrl.startsWith('http') ? siteSettings.heroImageUrl : `${baseUrl}${siteSettings.heroImageUrl}`) : `${baseUrl}/logo.png`,
    url: baseUrl,
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

      {/* Header */}
      <div className="bg-[#0f2d22] text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <FadeIn direction="down">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
              {siteSettings.aboutHeroEyebrow || 'OUR SOJAT HERITAGE'}
            </span>
            <h1 className="font-momo-display text-4xl sm:text-5xl font-normal text-white">
              {siteSettings.aboutHeroTitle || 'About Musky Dose'}
            </h1>
            <p className="text-sm sm:text-base text-[#b2c8be] leading-relaxed">
              {siteSettings.aboutHeroSubtitle || 'Delivering authentic, highest-pigment Henna & pure Indian herbal wellness directly from Sojat, Rajasthan.'}
            </p>
          </div>
        </FadeIn>
      </div>

      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 space-y-4">
            <FadeIn direction="left">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-widest">
                {siteSettings.aboutSectionEyebrow || 'THE HENNA CAPITAL OF INDIA'}
              </span>
              <h2 className="font-momo-display text-3xl font-normal text-[#0f2d22] mt-1">
                {siteSettings.aboutSectionHeading || 'Rooted In Sojat, Rajasthan'}
              </h2>
              <p className="text-sm text-[#2b302c] leading-relaxed mt-3">
                {siteSettings.aboutText ||
                  'Musky Dose was established with a singular objective: to eliminate adulteration in henna products by providing pure, farm-fresh Lawsonia Inermis directly from Sojat.'}
              </p>
              <p className="text-sm text-[#626c66] leading-relaxed mt-2">
                {siteSettings.aboutParagraph2 ||
                  'Sojat’s unique arid soil and climate naturally produce henna leaves containing high concentrations of Lawsone (the natural red-orange pigment). We harvest leaves at peak maturity and micro-cloth filter them to produce silk-smooth powders loved by brides and artists worldwide.'}
              </p>
            </FadeIn>
          </div>

          <div className="md:col-span-6">
            <FadeIn direction="right" delay={0.2}>
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#e8e2d5] shadow-md">
                <Image
                  src={sanitizeImageUrl(siteSettings.aboutImageUrl)}
                  alt={siteSettings.aboutSectionHeading || 'Sojat Henna Field'}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Pillars */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[#e8e2d5]">
          <StaggerItem className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-3 hover:shadow-md transition-shadow">
            <ShieldCheck className="w-8 h-8 text-[#1b4332]" />
            <h3 className="font-momo-display text-xl font-normal text-[#0f2d22]">
              {siteSettings.aboutPillar1Title || 'Zero Adulteration'}
            </h3>
            <p className="text-xs text-[#626c66] leading-relaxed">
              {siteSettings.aboutPillar1Description || 'We never add chemicals, artificial dyes, sodium picramate, or metallic salts to our products.'}
            </p>
          </StaggerItem>

          <StaggerItem className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-3 hover:shadow-md transition-shadow">
            <Award className="w-8 h-8 text-[#c5a059]" />
            <h3 className="font-momo-display text-xl font-normal text-[#0f2d22]">
              {siteSettings.aboutPillar2Title || 'Ultra-Fine Sifted'}
            </h3>
            <p className="text-xs text-[#626c66] leading-relaxed">
              {siteSettings.aboutPillar2Description || 'Our ultra-fine sifting process ensures smooth, clog-free cone flow and rich dye release.'}
            </p>
          </StaggerItem>

          <StaggerItem className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-3 hover:shadow-md transition-shadow">
            <Heart className="w-8 h-8 text-[#1b4332]" />
            <h3 className="font-momo-display text-xl font-normal text-[#0f2d22]">
              {siteSettings.aboutPillar3Title || 'Farmer Empowerment'}
            </h3>
            <p className="text-xs text-[#626c66] leading-relaxed">
              {siteSettings.aboutPillar3Description || 'Sourced directly from local Sojat farmers at fair trade prices, sustaining rural livelihoods.'}
            </p>
          </StaggerItem>
        </StaggerContainer>
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
