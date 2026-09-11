import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import HeroCarousel from '@/components/HeroCarousel';
import TrustStrip from '@/components/TrustStrip';
import HomepageVideoSection from '@/components/HomepageVideoSection';
import SojatHeritageStory from '@/components/SojatHeritageStory';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { sanitizeImageUrl } from '@/lib/utils';
import { getCmsText } from '@/lib/cms';
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_WHY_CARDS, DEFAULT_TESTIMONIALS } from '@/lib/data-store';
import { HomepageSectionConfig, Product } from '@/lib/types';
import { resolveAuthoritativeHomepageProducts } from '@/lib/growth/product-catalog-governance';
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

export const revalidate = 60;

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
  const activeProducts = products.filter((p) => p && p.isActive !== false);

  // 3. Merchandised Homepage Products (Authoritative centralized resolution)
  const displayFeaturedProducts = resolveAuthoritativeHomepageProducts(activeProducts, siteSettings);

  // Active Sections Configuration from Settings or Default
  const rawSections: HomepageSectionConfig[] =
    siteSettings.homepageSections && siteSettings.homepageSections.length > 0
      ? siteSettings.homepageSections
      : DEFAULT_HOMEPAGE_SECTIONS;

  // Homepage Curated Ordering & Deduplication Guarantee:
  // Enforces exact sequence:
  // 1. Hero
  // 2. Trust Strip
  // 3. Our Best Sellers & Featured Range (Position #1 among discovery sections)
  // 4. Explore Our Product Categories (Immediately after Featured)
  // 5. Sojat Heritage Story
  // 6. Behind The Scenes / Processing Video
  // 7. The Musky Dose Promise / Why Us
  // 8. Quality Assurance & Customer Proof
  // 9. Single Wholesale Hub
  const sectionIds = new Set(rawSections.map((s) => s.id));
  const missingCanonicalSections = DEFAULT_HOMEPAGE_SECTIONS.filter(
    (ds) =>
      !sectionIds.has(ds.id) &&
      ['trust_strip', 'bestsellers', 'categories', 'sojat_story', 'video', 'why_musky_dose', 'reviews', 'wholesale_cta'].includes(ds.id)
  );
  const completeSections = [...rawSections, ...missingCanonicalSections];

  const configuredSections = completeSections.map((sec) => {
    if (sec.id === 'hero') {
      return { ...sec, sortOrder: 1 };
    }
    if (sec.id === 'trust_strip') {
      return { ...sec, enabled: true, sortOrder: 2 };
    }
    if (sec.id === 'bestsellers') {
      return { ...sec, enabled: true, sortOrder: 3 };
    }
    if (sec.id === 'categories') {
      return { ...sec, enabled: true, sortOrder: 4 };
    }
    if (sec.id === 'sojat_story') {
      return { ...sec, enabled: true, sortOrder: 5 };
    }
    if (sec.id === 'video' || sec.id === 'homepage_video') {
      return { ...sec, enabled: true, sortOrder: 6 };
    }
    if (sec.id === 'why_musky_dose') {
      return { ...sec, enabled: true, sortOrder: 7 };
    }
    if (sec.id === 'reviews' || sec.id === 'testimonials') {
      return { ...sec, enabled: true, sortOrder: 8 };
    }
    if (sec.id === 'wholesale_cta') {
      return { ...sec, enabled: true, sortOrder: 9 };
    }
    if (
      sec.id === 'signature_henna' ||
      sec.id === 'other_products' ||
      sec.id === 'new_arrivals' ||
      sec.id === 'factory_story' ||
      sec.id === 'whatsapp_cta' ||
      sec.id === 'whatsapp_guide'
    ) {
      // Deduplicate: 'bestsellers' is the SINGLE curated product showcase; SojatHeritageStory handles heritage; wholesale_cta handles B2B; canonical store handles orders
      return { ...sec, enabled: false };
    }
    return { ...sec, sortOrder: (sec.sortOrder || 10) + 10 };
  });

  // Strict deduplication of section aliases (e.g. video vs homepage_video, reviews vs testimonials)
  const seenCanonicalKeys = new Set<string>();
  const deduplicatedSections = configuredSections.filter((sec) => {
    if (sec.enabled === false) return false;
    const normalizedKey =
      sec.id === 'homepage_video' ? 'video' :
      sec.id === 'testimonials' ? 'reviews' :
      sec.id;
    if (seenCanonicalKeys.has(normalizedKey)) return false;
    seenCanonicalKeys.add(normalizedKey);
    return true;
  });

  const activeSections = deduplicatedSections.sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

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
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#c5a059] uppercase tracking-widest block mb-1 font-sans">
                      {sec.subheading || 'Shop by Category'}
                    </span>
                    <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22]">
                      {sec.heading || 'Explore Our Herbal Collections'}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#626c66] mt-1 font-sans font-medium">
                      {sec.description || 'Authentic Lawsonia Inermis henna and traditional botanical care from Sojat farms.'}
                    </p>
                  </div>
                  <Link
                    href="/categories"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] border-b-2 border-[#c5a059] pb-0.5 shrink-0 transition-all font-sans"
                  >
                    <span>View All Categories</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
                  </Link>
                </div>

                {/* Category Grid: Responsive layout for any category count */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 ${
                  homepageCategories.length === 3
                    ? 'lg:grid-cols-3'
                    : homepageCategories.length === 5
                    ? 'lg:grid-cols-5'
                    : homepageCategories.length >= 6
                    ? 'lg:grid-cols-3 xl:grid-cols-6'
                    : 'lg:grid-cols-4'
                } gap-3 sm:gap-6`}>
                  {homepageCategories.map((cat) => (
                    <div key={cat.id} className="h-full flex flex-col">
                      <CategoryCard category={cat} />
                    </div>
                  ))}
                </div>
              </section>
            );

          case 'bestsellers': {
            // Canonical authoritative curated products (enforcing isFeatured && isActive)
            const curatedProducts = sec.selectedProductIds && sec.selectedProductIds.length > 0
              ? sec.selectedProductIds
                  .map((id) => displayFeaturedProducts.find((p) => p.id === id))
                  .filter((p): p is Product => Boolean(p))
              : displayFeaturedProducts;

            const displayBestsellers = curatedProducts.slice(
              0,
              sec.itemLimit && sec.itemLimit > 0 ? sec.itemLimit : undefined
            );

            // Never show empty or auto-filled unfeatured products
            if (displayBestsellers.length === 0) return null;

            return (
              <section key={sec.id} className="py-8 sm:py-12 bg-[#fcfbf7] border-b border-[#e8e2d5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-[#c5a059] uppercase tracking-widest block mb-1 font-sans">
                        {sec.subheading || 'POPULAR CHOICE'}
                      </span>
                      <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22]">
                        {sec.heading || 'Our Best Sellers & Featured Range'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#626c66] mt-1 font-sans font-medium max-w-2xl">
                        {sec.description || 'Handpicked, high-lawsone Sojat henna and customer-favorite herbal remedies.'}
                      </p>
                    </div>
                    <Link
                      href={sec.ctaLink || '/products'}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] border-b-2 border-[#c5a059] pb-0.5 shrink-0 transition-all font-sans"
                    >
                      <span>{sec.ctaText || 'View All Products'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
                    </Link>
                  </div>

                  {/* 2-column mobile grid, 4-column balanced desktop grid */}
                  <div className={`grid ${siteSettings?.layoutControls?.mobileGridColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} sm:grid-cols-2 md:grid-cols-3 ${siteSettings?.layoutControls?.desktopGridColumns === 3 ? 'lg:grid-cols-3' : siteSettings?.layoutControls?.desktopGridColumns === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 sm:gap-5 lg:gap-6`}>
                    {displayBestsellers.map((prod) => (
                      <div key={prod.id} className="h-full flex flex-col">
                        <ProductCard product={prod} whatsappNumber={whatsappNumber} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          case 'signature_henna':
          case 'other_products':
          case 'new_arrivals':
            // Removed duplicate product-grid showcases; 'bestsellers' is the single curated showcase
            return null;

          case 'video':
          case 'homepage_video':
            return (
              <HomepageVideoSection
                key={sec.id}
                section={sec}
                siteSettings={siteSettings}
              />
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
                  <div className="max-w-3xl mx-auto text-center space-y-2 sm:space-y-3">
                    <div className="inline-flex items-center gap-2 text-[#c5a059] font-bold text-xs uppercase tracking-widest">
                      <Leaf className="w-4 h-4" />
                      <span>{sec.subheading || 'The Musky Dose Promise'}</span>
                    </div>
                    <h2 className="font-momo-display text-2xl sm:text-4xl font-normal text-[#0f2d22]">
                      {sec.heading || siteSettings.whyMuskyDoseTitle || 'Why Musky Dose'}
                    </h2>
                    <p className="text-xs sm:text-base text-[#626c66] leading-relaxed">
                      {sec.description || siteSettings.whyMuskyDoseDescription || 'Authentic, unadulterated Lawsonia Inermis henna and herbal care cultivated and processed in Sojat, Rajasthan.'}
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6">
                    {whyCards.map((card, idx) => (
                      <div key={card.id || idx} className="bg-white p-3.5 sm:p-6 rounded-2xl border border-[#e8e2d5] text-center space-y-1.5 sm:space-y-2 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 border ${
                          idx % 2 === 0
                            ? 'bg-[#e8f3ed] text-[#1b4332] border-[#2d6a4f]/20'
                            : 'bg-[#faf5e8] text-[#c5a059] border-[#c5a059]/30'
                        }`}>
                          {card.icon && iconMap[card.icon] ? iconMap[card.icon] : <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-[#1b4332]" />}
                        </div>
                        <h3 className="font-momo-display text-sm sm:text-lg font-normal text-[#0f2d22]">{card.title.replace(/Shifted/gi, 'Sifted')}</h3>
                        <p className="text-[11px] sm:text-xs text-[#626c66] leading-relaxed line-clamp-3 sm:line-clamp-none">{card.description.replace(/Shifted/gi, 'Sifted')}</p>
                      </div>
                    ))}
                  </div>
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

            return (
              <section key={sec.id} className="py-8 sm:py-14 lg:py-16 bg-[#faf8f5] border-y border-[#e8e2d5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-3xl mx-auto text-center space-y-2 sm:space-y-3 mb-6 sm:mb-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f3ed] border border-[#2d6a4f]/20 text-[#1b4332] text-[11px] sm:text-xs font-bold tracking-widest uppercase font-sans">
                      <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>{sec.subheading || (testimonials.length > 0 ? 'CUSTOMER REVIEWS' : 'QUALITY & PURITY ASSURANCE')}</span>
                    </div>
                    <h2 className="font-momo-display text-2xl sm:text-3xl lg:text-4xl font-normal text-[#0f2d22]">
                      {sec.heading || (testimonials.length > 0 ? 'Loved By Henna Artists & Hair Care Lovers' : 'Authentic Sojat Henna: Verified Botanical Quality')}
                    </h2>
                    <p className="text-xs sm:text-sm lg:text-base text-[#626c66] leading-relaxed max-w-2xl mx-auto font-sans font-medium">
                      {sec.description || (testimonials.length > 0
                        ? 'Read authentic reviews from customers across India who rely on Musky Dose Sojat Henna.'
                        : 'Every batch of Lawsonia Inermis is solar-dried, triple micro-sifted, and dispatched directly from Sojat, Rajasthan without chemical additives.')}
                    </p>
                  </div>

                  {testimonials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {testimonials.map((t) => (
                        <div key={t.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex flex-col justify-between space-y-3 sm:space-y-4 hover:shadow-md transition-shadow">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1 text-[#c5a059]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < (t.rating || 5) ? 'fill-[#c5a059] text-[#c5a059]' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-[#2d3a33] leading-relaxed italic font-sans">&quot;{t.reviewText}&quot;</p>
                          </div>
                          <div className="pt-2 sm:pt-3 border-t border-[#f0ece1]">
                            <p className="font-bold text-xs sm:text-sm text-[#0f2d22] font-sans">{t.customerName}</p>
                            {t.location && <p className="text-[10px] sm:text-[11px] text-[#626c66] font-medium font-sans">{t.location}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* High-Trust Editorial Quality Proof Cards (Zero fabricated reviews, factual processing benchmarks) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#1b4332] bg-[#e8f3ed] px-2.5 py-0.5 rounded-full uppercase border border-[#2d6a4f]/20 font-sans">
                            High Lawsone
                          </span>
                          <Sparkles className="w-4 h-4 text-[#c5a059]" />
                        </div>
                        <h3 className="font-momo-display text-base sm:text-lg text-[#0f2d22] font-normal">Natural Dye Density</h3>
                        <p className="text-xs text-[#626c66] leading-relaxed font-sans font-medium">
                          Sourced strictly from mature Lawsonia Inermis crops in Sojat, yielding deep auburn and rich burgundy stains naturally.
                        </p>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#1b4332] bg-[#e8f3ed] px-2.5 py-0.5 rounded-full uppercase border border-[#2d6a4f]/20 font-sans">
                            Triple Sifted
                          </span>
                          <Droplets className="w-4 h-4 text-[#c5a059]" />
                        </div>
                        <h3 className="font-momo-display text-base sm:text-lg text-[#0f2d22] font-normal">Micro-Cloth Sifted</h3>
                        <p className="text-xs text-[#626c66] leading-relaxed font-sans font-medium">
                          Ultra-fine cloth filtration eliminates coarse stems and fiber, producing silky, clog-free cone application paste.
                        </p>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#1b4332] bg-[#e8f3ed] px-2.5 py-0.5 rounded-full uppercase border border-[#2d6a4f]/20 font-sans">
                            Zero Additives
                          </span>
                          <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                        </div>
                        <h3 className="font-momo-display text-base sm:text-lg text-[#0f2d22] font-normal">Clean Botanical Care</h3>
                        <p className="text-xs text-[#626c66] leading-relaxed font-sans font-medium">
                          Zero PPD, sodium picramate, metallic salts, or synthetic dyes. Suitable for hair and beauty use (patch test recommended).
                        </p>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-2.5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#1b4332] bg-[#e8f3ed] px-2.5 py-0.5 rounded-full uppercase border border-[#2d6a4f]/20 font-sans">
                            Direct Dispatch
                          </span>
                          <Package className="w-4 h-4 text-[#c5a059]" />
                        </div>
                        <h3 className="font-momo-display text-base sm:text-lg text-[#0f2d22] font-normal">Fresh Farm Origin</h3>
                        <p className="text-xs text-[#626c66] leading-relaxed font-sans font-medium">
                          Milled and packed directly at our Sojat facility with airtight moisture-barrier packaging to preserve dye freshness.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          }

          case 'sojat_story':
            return (
              <SojatHeritageStory
                key={sec.id}
                section={sec}
                siteSettings={siteSettings}
              />
            );

          case 'wholesale_cta':
            return (
              <section key={sec.id} className="py-8 sm:py-12 lg:py-16 bg-[#faf8f5] border-y border-[#e8e2d5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-[#0f2d22] to-[#1b4332] text-white p-6 sm:p-10 lg:p-12 border border-[#c5a059]/40 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#c5a059]/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 text-center space-y-4 sm:space-y-6">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40 text-[11px] sm:text-xs font-bold tracking-widest uppercase font-sans">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>B2B & WHOLESALE HUB</span>
                      </div>

                      <h2 className="font-momo-display text-2xl sm:text-3xl lg:text-4xl font-normal text-white leading-tight">
                        {sec.heading || 'Wholesale Henna, Indigo & Bulk Botanical Supply'}
                      </h2>

                      <p className="text-xs sm:text-sm lg:text-base text-[#d3e2da] leading-relaxed max-w-2xl mx-auto font-sans font-medium">
                        {sec.description || 'Direct factory supply for salons, bridal henna artists, cosmetic brands, and exporters. Available in custom bulk formats and private-label packaging directly from Sojat, Rajasthan.'}
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1 text-[11px] sm:text-xs font-semibold text-[#fcfbf7] font-sans">
                        <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15">
                          ✓ Tiered Volume Pricing
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15">
                          ✓ Direct Sojat Factory Dispatch
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15">
                          ✓ Commercial & Bulk Packaging Available
                        </span>
                      </div>

                      <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        <Link
                          href="/wholesale"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg hover:scale-105 font-sans"
                        >
                          <Building2 className="w-4 h-4 text-[#0f2d22]" />
                          <span>Wholesale & Bulk Enquiries</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );

          case 'whatsapp_cta':
          case 'whatsapp_guide':
            // Removed duplicate fragmented WhatsApp ordering flow; canonical flow is Cart/Checkout
            return null;

          default:
            return null;
        }
      })}

      {/* 4. FINAL STORE CONVERSION CTA */}
      <section className="py-10 sm:py-14 lg:py-16 bg-[#fcfbf7] border-t border-[#e8e2d5]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f3ed] border border-[#2d6a4f]/20 text-[#1b4332] text-[11px] sm:text-xs font-bold tracking-widest uppercase font-sans">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>AUTHENTIC SOJAT BOTANICALS</span>
          </div>
          <h2 className="font-momo-display text-2xl sm:text-3xl lg:text-4xl font-normal text-[#0f2d22]">
            {siteSettings.finalCtaHeading || cms.finalCtaHeading || 'Ready To Experience Pure Sojat Henna?'}
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#626c66] leading-relaxed max-w-2xl mx-auto font-sans font-medium">
            {siteSettings.finalCtaDescription || cms.finalCtaDescription || 'Shop our ultra-fine sifted Lawsonia Inermis mehendi, natural indigo, and herbal hair care directly from Sojat. Safe online checkout and fast doorstep delivery across India.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl font-extrabold text-xs sm:text-sm tracking-wider shadow-md hover:shadow-xl transition-all hover:scale-105 uppercase border border-[#c5a059]/40 font-sans"
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#c5a059]" />
              <span>
                {siteSettings.finalCtaButtonText || cms.finalCtaButtonText || 'Explore All Products'}
              </span>
            </Link>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello Musky Dose! I have a question about your Sojat henna products.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-[#f3ede2] text-[#1b4332] font-bold text-xs sm:text-sm border border-[#e8e2d5] shadow-xs transition-all font-sans"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>Need Assistance? WhatsApp Us</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 5. GLOBAL FOOTER & FLOATING WHATSAPP BUTTON */}
      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
