import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import HeroCarousel from '@/components/HeroCarousel';
import TrustStrip from '@/components/TrustStrip';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { FadeIn, StaggerContainer, StaggerItem, FloatingElement } from '@/components/Motion';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { sanitizeImageUrl } from '@/lib/utils';
import { getCmsText } from '@/lib/cms';
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_WHY_CARDS, DEFAULT_TESTIMONIALS } from '@/lib/data-store';
import { HomepageSectionConfig } from '@/lib/types';
import {
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Leaf,
  Factory,
  Droplets,
  Truck,
  Building2,
  Package,
  Award,
  Star,
  Quote,
} from 'lucide-react';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'homepage',
    targetUrl: '/',
    defaultTitle: 'Musky Dose — Premium Natural Henna & Herbal Products from Sojat',
    defaultDescription: 'Rooted in Nature. Made for You. Pure Sojat Henna Powder, Natural Indigo & Herbal Products directly from Sojat, Rajasthan.',
    defaultKeywords: ['Musky Dose', 'Sojat Henna', 'Natural Mehendi', 'Herbal Care', 'Rajasthan Henna'],
    defaultImage: '/images/hero-bg.jpg',
  });
}

export default async function HomePage() {
  const [products, categories, siteSettings] = await Promise.all([
    getProducts(),
    getCategories(),
    getSiteSettings(),
  ]);

  const whatsappNumber = getConfiguredWhatsAppNumber(siteSettings);
  const cms = getCmsText(siteSettings);

  // 1. Filter & Order Active Categories for Homepage
  let activeCategories = categories.filter((cat) => cat.isActive !== false);

  if (siteSettings.homepageCategories && siteSettings.homepageCategories.length > 0) {
    const catMap = new Map(siteSettings.homepageCategories.map((c) => [c.id, c]));
    activeCategories = activeCategories
      .filter((cat) => catMap.get(cat.id)?.enabled !== false)
      .sort((a, b) => {
        const orderA = catMap.get(a.id)?.sortOrder ?? a.sortOrder ?? 999;
        const orderB = catMap.get(b.id)?.sortOrder ?? b.sortOrder ?? 999;
        return orderA - orderB;
      });
  } else {
    activeCategories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  // 2. Active Products Only (Never render inactive products on public homepage)
  const activeProducts = products.filter((p) => p.isActive !== false);

  // 3. Merchandised Homepage Products
  let displayFeaturedProducts: typeof activeProducts = [];

  if (siteSettings.homepageProducts && siteSettings.homepageProducts.length > 0) {
    const prodMap = new Map(siteSettings.homepageProducts.map((p) => [p.id, p]));
    const configuredList = activeProducts.filter((p) => {
      const config = prodMap.get(p.id);
      return config ? config.enabled !== false : false;
    });

    configuredList.sort((a, b) => {
      const orderA = prodMap.get(a.id)?.sortOrder ?? (a.sortOrder || 999);
      const orderB = prodMap.get(b.id)?.sortOrder ?? (b.sortOrder || 999);
      return orderA - orderB;
    });

    if (configuredList.length > 0) {
      displayFeaturedProducts = configuredList;
    }
  }

  if (displayFeaturedProducts.length === 0) {
    const fallbackFeatured = activeProducts
      .filter((p) => p.isFeatured || p.isBestSeller)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    displayFeaturedProducts = fallbackFeatured.length > 0 ? fallbackFeatured : activeProducts.slice(0, 6);
  }

  // Active Sections Configuration from Settings or Default
  const configuredSections: HomepageSectionConfig[] =
    siteSettings.homepageSections && siteSettings.homepageSections.length > 0
      ? siteSettings.homepageSections
      : DEFAULT_HOMEPAGE_SECTIONS;

  const activeSections = configuredSections
    .filter((sec) => sec.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col font-sans selection:bg-[#c5a059]/30 selection:text-[#0f2d22]">
      {/* 1. GLOBAL MARKETPLACE HEADER */}
      <Navbar siteSettings={siteSettings} />

      {/* 2. DYNAMIC HOMEPAGE SECTIONS */}
      {activeSections.map((sec) => {
        switch (sec.id) {
          case 'hero':
            return (
              <HeroCarousel
                key={sec.id}
                siteSettings={siteSettings}
              />
            );

          case 'trust_strip':
            return (
              <TrustStrip
                key={sec.id}
                siteSettings={siteSettings}
                heading={sec.heading}
                subheading={sec.subheading}
              />
            );

          case 'bestsellers':
          case 'other_products': {
            let displayBestsellers = displayFeaturedProducts;
            if (sec.selectedProductIds && sec.selectedProductIds.length > 0) {
              const selected = activeProducts.filter((p) => sec.selectedProductIds?.includes(p.id));
              if (selected.length > 0) {
                selected.sort((a, b) => {
                  const idxA = sec.selectedProductIds!.indexOf(a.id);
                  const idxB = sec.selectedProductIds!.indexOf(b.id);
                  return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
                });
                displayBestsellers = selected;
              }
            }
            displayBestsellers = displayBestsellers.slice(0, sec.itemLimit || 8);
            if (displayBestsellers.length === 0) return null;

            return (
              <section key={sec.id} className="py-8 sm:py-12 bg-[#fcfbf7] border-b border-[#e8e2d5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <FadeIn direction="up">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-[#c5a059] uppercase tracking-widest block mb-1">
                          {sec.subheading || 'BESTSELLERS & FEATURED'}
                        </span>
                        <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22]">
                          {sec.heading || 'Most Loved Sojat Henna & Herbal Care'}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#626c66] mt-1 font-medium max-w-2xl">
                          {sec.description || 'Customer favorites chosen for superior dye release, purity, and natural formulation.'}
                        </p>
                      </div>
                      <Link
                        href={sec.ctaLink || '/products'}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] border-b-2 border-[#c5a059] pb-0.5 shrink-0 transition-all"
                      >
                        <span>{sec.ctaText || 'VIEW ALL PRODUCTS'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
                      </Link>
                    </div>
                  </FadeIn>

                  <StaggerContainer className={`grid ${siteSettings?.layoutControls?.mobileGridColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} sm:grid-cols-3 md:grid-cols-3 ${siteSettings?.layoutControls?.desktopGridColumns === 3 ? 'lg:grid-cols-3' : siteSettings?.layoutControls?.desktopGridColumns === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 sm:gap-5 lg:gap-6`} staggerDelay={0.08}>
                    {displayBestsellers.map((prod) => (
                      <StaggerItem key={prod.id} className="h-full flex flex-col">
                        <ProductCard product={prod} whatsappNumber={whatsappNumber} siteSettings={siteSettings} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </section>
            );
          }

          case 'categories':
            let displayCategories = activeCategories;
            if (sec.selectedCategoryIds && sec.selectedCategoryIds.length > 0) {
              const selected = activeCategories.filter((c) => sec.selectedCategoryIds?.includes(c.id));
              if (selected.length > 0) {
                selected.sort((a, b) => {
                  const idxA = sec.selectedCategoryIds!.indexOf(a.id);
                  const idxB = sec.selectedCategoryIds!.indexOf(b.id);
                  return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
                });
                displayCategories = selected;
              }
            }
            const categoryLimit = sec.itemLimit || siteSettings?.homepageCategoryCount || 6;
            const homepageCategories = displayCategories.slice(0, categoryLimit);
            if (homepageCategories.length === 0) return null;

            return (
              <section key={sec.id} className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <FadeIn direction="up">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-[#c5a059] uppercase tracking-widest block mb-1">
                        {sec.subheading || 'SHOP BY CATEGORY'}
                      </span>
                      <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22]">
                        {sec.heading || 'Explore Our Herbal Collections'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#626c66] mt-1 font-medium">
                        {sec.description || 'Authentic Lawsonia Inermis henna and traditional botanical care from Sojat farms.'}
                      </p>
                    </div>
                    <Link
                      href="/categories"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] border-b-2 border-[#c5a059] pb-0.5 shrink-0 transition-all"
                    >
                      <span>VIEW ALL CATEGORIES</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
                    </Link>
                  </div>
                </FadeIn>

                {/* Category Grid: 2 columns on mobile, 4 columns on desktop */}
                <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6" staggerDelay={0.08}>
                  {homepageCategories.map((cat) => (
                    <StaggerItem key={cat.id} className="h-full flex flex-col">
                      <CategoryCard category={cat} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                {/* View All Categories CTA below grid */}
                <div className="mt-6 sm:mt-8 text-center">
                  <Link
                    href="/categories"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#1b4332] text-[#c5a059] font-bold text-xs sm:text-sm shadow-xs hover:bg-[#0f2d22] hover:text-white transition-all border border-[#c5a059]/40 group"
                  >
                    <span>View All Categories →</span>
                  </Link>
                </div>
              </section>
            );

          case 'why_musky_dose': {
            const whyCards = (siteSettings.whyCards && siteSettings.whyCards.length > 0
              ? siteSettings.whyCards
              : DEFAULT_WHY_CARDS
            ).filter((card) => card.enabled !== false)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

            const iconMap: Record<string, React.ReactNode> = {
              ShieldCheck: <ShieldCheck className="w-6 h-6 text-[#1b4332]" />,
              Leaf: <Leaf className="w-6 h-6 text-[#c5a059]" />,
              Droplets: <Droplets className="w-6 h-6 text-[#1b4332]" />,
              Factory: <Factory className="w-6 h-6 text-[#c5a059]" />,
              Award: <Award className="w-6 h-6 text-[#1b4332]" />,
              Sparkles: <Sparkles className="w-6 h-6 text-[#c5a059]" />,
            };

            return (
              <section key={sec.id} className="py-8 sm:py-14 lg:py-16 bg-[#fcfbf7] border-b border-[#e8e2d5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <FadeIn direction="up">
                    <div className="max-w-3xl mx-auto text-center space-y-2 sm:space-y-3">
                      <div className="inline-flex items-center gap-2 text-[#c5a059] font-bold text-xs uppercase tracking-widest">
                        <Leaf className="w-4 h-4" />
                        <span>{sec.subheading || 'THE MUSKY DOSE PROMISE'}</span>
                      </div>
                      <h2 className="font-momo-display text-2xl sm:text-4xl font-normal text-[#0f2d22]">
                        {sec.heading || siteSettings.whyMuskyDoseTitle || 'Why Musky Dose'}
                      </h2>
                      <p className="text-xs sm:text-base text-[#626c66] leading-relaxed">
                        {sec.description || siteSettings.whyMuskyDoseDescription || 'Authentic, unadulterated Lawsonia Inermis henna and herbal care cultivated and processed in Sojat, Rajasthan.'}
                      </p>
                    </div>
                  </FadeIn>

                  <StaggerContainer className="mt-6 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6" staggerDelay={0.1}>
                    {whyCards.map((card, idx) => (
                      <StaggerItem key={card.id || idx} className="bg-white p-3.5 sm:p-6 rounded-2xl border border-[#e8e2d5] text-center space-y-1.5 sm:space-y-2 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 border ${
                          idx % 2 === 0
                            ? 'bg-[#e8f3ed] text-[#1b4332] border-[#2d6a4f]/20'
                            : 'bg-[#faf5e8] text-[#c5a059] border-[#c5a059]/30'
                        }`}>
                          {card.icon && iconMap[card.icon] ? iconMap[card.icon] : <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-[#1b4332]" />}
                        </div>
                        <h3 className="font-momo-display text-sm sm:text-lg font-normal text-[#0f2d22]">{card.title}</h3>
                        <p className="text-[11px] sm:text-xs text-[#626c66] leading-relaxed line-clamp-3 sm:line-clamp-none">{card.description}</p>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </section>
            );
          }

          case 'reviews':
          case 'testimonials': {
            const testimonials = (siteSettings.testimonials && siteSettings.testimonials.length > 0
              ? siteSettings.testimonials
              : DEFAULT_TESTIMONIALS
            ).filter((t) => t.enabled !== false)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

            if (testimonials.length === 0) return null;

            return (
              <section key={sec.id} className="py-8 sm:py-14 lg:py-16 bg-[#faf8f5] border-y border-[#e8e2d5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <FadeIn direction="up">
                    <div className="max-w-3xl mx-auto text-center space-y-2 sm:space-y-3 mb-6 sm:mb-10">
                      <div className="inline-flex items-center gap-2 text-[#c5a059] font-bold text-xs uppercase tracking-widest">
                        <Quote className="w-4 h-4" />
                        <span>{sec.subheading || 'CUSTOMER REVIEWS'}</span>
                      </div>
                      <h2 className="font-momo-display text-2xl sm:text-4xl font-normal text-[#0f2d22]">
                        {sec.heading || 'Loved By Henna Artists & Hair Care Lovers'}
                      </h2>
                      <p className="text-xs sm:text-base text-[#626c66] leading-relaxed">
                        {sec.description || 'Read authentic reviews from customers across India who rely on Musky Dose Sojat Henna.'}
                      </p>
                    </div>
                  </FadeIn>

                  <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6" staggerDelay={0.1}>
                    {testimonials.map((t) => (
                      <StaggerItem key={t.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex flex-col justify-between space-y-3 sm:space-y-4 hover:shadow-md transition-shadow">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-1 text-[#c5a059]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < (t.rating || 5) ? 'fill-[#c5a059] text-[#c5a059]' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-[#2d3a33] leading-relaxed italic">&quot;{t.reviewText}&quot;</p>
                        </div>
                        <div className="pt-2 sm:pt-3 border-t border-[#f0ece1]">
                          <p className="font-bold text-xs sm:text-sm text-[#0f2d22]">{t.customerName}</p>
                          {t.location && <p className="text-[10px] sm:text-[11px] text-[#626c66] font-medium">{t.location}</p>}
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </section>
            );
          }

          case 'sojat_story':
            return (
              <section key={sec.id} className="py-8 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <FadeIn direction="up" duration={0.6}>
                  <div className="bg-[#0f2d22] text-white rounded-3xl overflow-hidden shadow-2xl border border-[#2d6a4f]/40 grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-7 p-5 sm:p-10 lg:p-14 flex flex-col justify-center space-y-3 sm:space-y-5">
                      <span className="inline-flex items-center gap-2 text-[#c5a059] font-semibold text-xs uppercase tracking-widest">
                        <Leaf className="w-4 h-4" /> {sec.subheading || 'REGIONAL HERITAGE'}
                      </span>
                      <h2 className="font-momo-display text-2xl sm:text-4xl lg:text-5xl font-normal text-white leading-tight">
                        {sec.heading || 'From Sojat, Rajasthan — The Henna Capital'}
                      </h2>
                      <p className="text-xs sm:text-base text-[#b2c8be] leading-relaxed">
                        {sec.description || 'Rooted in the heart of Sojat, Rajasthan, Musky Dose brings natural henna and herbal care from our region directly to customers across India. Sourced from traditional solar-dried farms and processed with care, our products carry the rich heritage of Rajasthan.'}
                      </p>
                      <div>
                        <Link
                          href="/about"
                          className="inline-flex items-center gap-2 bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md hover:scale-105"
                        >
                          <span>DISCOVER OUR STORY</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="lg:col-span-5 relative min-h-[200px] sm:min-h-[280px] lg:min-h-full overflow-hidden">
                      <Image
                        src={sanitizeImageUrl(siteSettings.factoryImageUrl)}
                        alt="Sojat Rajasthan Henna Sourcing"
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </FadeIn>
              </section>
            );

          case 'wholesale_cta':
            return (
              <section key={sec.id} className="py-8 sm:py-12 lg:py-14 bg-[#1b4332] text-white border-y border-[#2d6a4f]/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <FadeIn direction="up">
                    <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#c5a059]/20 text-[#c5a059] flex items-center justify-center mx-auto border border-[#c5a059]/40">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <h2 className="font-momo-display text-2xl sm:text-4xl font-normal text-white">
                        {sec.heading || 'Looking for Wholesale Henna & Bulk Supply?'}
                      </h2>
                      <p className="text-xs sm:text-base text-[#b2c8be] leading-relaxed max-w-2xl mx-auto">
                        {sec.description || 'Connect with Musky Dose for bulk requirements, 25kg/50kg bags, salon supply, and custom private label packaging directly from Sojat, Rajasthan.'}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-1 sm:pt-2">
                        <Link
                          href="/wholesale"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase transition-all shadow-lg hover:scale-105"
                        >
                          <Package className="w-4 h-4" />
                          <span>WHOLESALE ENQUIRY</span>
                        </Link>

                        <Link
                          href="/wholesale?mode=bulk"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3.5 sm:px-7 sm:py-4 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide uppercase transition-all shadow-lg hover:scale-105"
                        >
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          <span>BULK & WHOLESALE INQUIRY</span>
                        </Link>
                      </div>
                    </div>
                  </FadeIn>
                </div>
              </section>
            );

          case 'whatsapp_cta':
          case 'whatsapp_guide':
            return (
              <section key={sec.id} className="py-8 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <FadeIn direction="up">
                  <div className="text-center space-y-2 sm:space-y-3 max-w-2xl mx-auto mb-6 sm:mb-10">
                    <span className="text-xs font-bold text-[#c5a059] uppercase tracking-widest block">
                      {siteSettings.whatsappGuideSubheading || sec.subheading || 'HOW ORDERING WORKS'}
                    </span>
                    <h2 className="font-momo-display text-2xl sm:text-4xl font-normal text-[#0f2d22]">
                      {siteSettings.whatsappGuideHeading || sec.heading || 'Simple 3-Step WhatsApp Ordering'}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#626c66] leading-relaxed">
                      {siteSettings.whatsappGuideDescription || sec.description || 'We operate a direct WhatsApp ordering model so you receive personal service and prompt response directly from Sojat.'}
                    </p>
                  </div>
                </FadeIn>

                <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6" staggerDelay={0.15}>
                  <StaggerItem className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-[#e8e2d5] shadow-xs relative space-y-2 sm:space-y-4 hover:shadow-md transition-shadow">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0f2d22] text-[#c5a059] font-serif-heading font-extrabold text-base sm:text-lg flex items-center justify-center shadow-xs">
                      1
                    </div>
                    <h3 className="font-momo-display text-base sm:text-xl font-normal text-[#0f2d22]">
                      {siteSettings.whatsappStep1Title || 'Select Your Products'}
                    </h3>
                    <p className="text-xs text-[#626c66] leading-relaxed">
                      {siteSettings.whatsappStep1Description || 'Browse available Musky Dose products and add your required items and quantities to your order cart.'}
                    </p>
                  </StaggerItem>

                  <StaggerItem className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-[#e8e2d5] shadow-xs relative space-y-2 sm:space-y-4 hover:shadow-md transition-shadow">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#25D366] text-white font-serif-heading font-extrabold text-base sm:text-lg flex items-center justify-center shadow-xs">
                      2
                    </div>
                    <h3 className="font-momo-display text-base sm:text-xl font-normal text-[#0f2d22]">
                      {siteSettings.whatsappStep2Title || 'Order on WhatsApp'}
                    </h3>
                    <p className="text-xs text-[#626c66] leading-relaxed">
                      {siteSettings.whatsappStep2Description || 'Click "Order on WhatsApp" to open a formatted WhatsApp message with your selected products pre-filled.'}
                    </p>
                  </StaggerItem>

                  <StaggerItem className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-[#e8e2d5] shadow-xs relative space-y-2 sm:space-y-4 hover:shadow-md transition-shadow">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0f2d22] text-[#c5a059] font-serif-heading font-extrabold text-base sm:text-lg flex items-center justify-center shadow-xs">
                      3
                    </div>
                    <h3 className="font-momo-display text-base sm:text-xl font-normal text-[#0f2d22]">
                      {siteSettings.whatsappStep3Title || 'Direct Sojat Dispatch'}
                    </h3>
                    <p className="text-xs text-[#626c66] leading-relaxed">
                      {siteSettings.whatsappStep3Description || 'Confirm delivery address and payment. We package and dispatch directly from Sojat, Rajasthan to your door.'}
                    </p>
                  </StaggerItem>
                </StaggerContainer>
              </section>
            );

          default:
            return null;
        }
      })}

      {/* 4. FINAL WHATSAPP CALLOUT SECTION */}
      <section className="py-8 sm:py-12 lg:py-16 bg-[#e8f3ed] border-t border-[#2d6a4f]/20">
        <FadeIn direction="up">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-4 sm:space-y-6">
            <FloatingElement duration={4} distance={8}>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#25D366] text-white flex items-center justify-center mx-auto shadow-lg border-2 border-white">
                <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 fill-white" />
              </div>
            </FloatingElement>
            <h2 className="font-momo-display text-2xl sm:text-4xl font-normal text-[#0f2d22]">
              {cms.finalCtaHeading || siteSettings.finalCtaHeading || 'Ready To Order Pure Sojat Henna?'}
            </h2>
            <p className="text-xs sm:text-base text-[#2d6a4f] leading-relaxed max-w-2xl mx-auto font-medium">
              {cms.finalCtaDescription || siteSettings.finalCtaDescription || 'We process retail and wholesale orders directly via WhatsApp. Click below to connect with our Sojat team instantly.'}
            </p>
            <div>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-extrabold text-xs sm:text-sm tracking-wider shadow-xl transition-all hover:scale-105 uppercase border border-[#c5a059]/40"
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#c5a059]" />
                <span>{cms.finalCtaButtonText || siteSettings.finalCtaButtonText || 'EXPLORE PRODUCTS & PLACE ORDER'}</span>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 5. GLOBAL FOOTER & FLOATING WHATSAPP BUTTON */}
      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
