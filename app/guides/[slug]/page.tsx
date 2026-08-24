import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSiteLogo } from '@/lib/brand-assets';
import {
  BookOpen,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Leaf,
  ShoppingBag,
  HelpCircle,
  Info,
  Clock,
  Box,
} from 'lucide-react';
import { getGuideBySlug, getPublishedGuides } from '@/lib/db/guides';
import { getSiteSettings } from '@/lib/db/settings';
import { getProducts } from '@/lib/db/products';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { formatPrice, safeJsonLd } from '@/lib/utils';

export const revalidate = 60; // Revalidate every 60s

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const guide = await getGuideBySlug(resolvedParams.slug);
  const settings = await getSiteSettings();
  const siteName = settings.brandName || 'Musky Dose';

  if (!guide) {
    return {
      title: `Guide Not Found | ${siteName}`,
    };
  }

  return await resolvePageSeoMetadata({
    targetType: 'guide',
    targetId: guide.id,
    targetUrl: `/guides/${guide.slug}`,
    defaultTitle: guide.seoTitle || `${guide.title} | ${siteName}`,
    defaultDescription: guide.seoDescription || guide.shortIntro || `Read complete guide about ${guide.title} from Musky Dose.`,
    defaultImage: guide.coverImage || settings.ogImageUrl || '/images/fallback.svg',
    defaultKeywords: [guide.title, 'Henna Guide', 'Sojat Henna Care', 'Musky Dose'],
  });
}

export default async function ProductGuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const [guide, siteSettings, allProducts, allGuides] = await Promise.all([
    getGuideBySlug(resolvedParams.slug),
    getSiteSettings(),
    getProducts(),
    getPublishedGuides(),
  ]);

  if (!guide || guide.published === false) {
    notFound();
  }

  const activeProducts = allProducts.filter((p) => p.isActive !== false);

  // Find primary linked product
  const primaryProduct = guide.productId
    ? activeProducts.find((p) => p.id === guide.productId)
    : null;

  // Find secondary linked products (for comparison guides)
  const comparisonProducts = Array.isArray(guide.productIds)
    ? activeProducts.filter((p) => guide.productIds?.includes(p.id))
    : [];

  // Find related products
  const relatedProducts = Array.isArray(guide.relatedProductIds)
    ? activeProducts.filter((p) => guide.relatedProductIds?.includes(p.id))
    : [];

  const displayProducts = relatedProducts.length > 0
    ? relatedProducts
    : primaryProduct
    ? [primaryProduct]
    : activeProducts.slice(0, 3);

  const whatsappPhone = getConfiguredWhatsAppNumber(siteSettings);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.shortIntro || guide.seoDescription,
    image: [guide.coverImage || '/images/fallback.svg'],
    datePublished: guide.createdAt || new Date().toISOString(),
    dateModified: guide.updatedAt || guide.createdAt || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: siteSettings.brandName || 'Musky Dose',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in',
    },
    publisher: {
      '@type': 'Organization',
      name: siteSettings.brandName || 'Musky Dose',
      logo: {
        '@type': 'ImageObject',
        url: getSiteLogo(siteSettings),
      },
    },
  };

  const faqLd = guide.faqs && guide.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
        />
      )}
      <Navbar siteSettings={siteSettings} />

      <main className="flex-grow">
        {/* BREADCRUMB & TOP NAV */}
        <div className="bg-[#f5f1e8] border-b border-[#e8e2d5] py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-600">
            <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <Link href="/" className="hover:text-[#1b4332] shrink-0">Home</Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Link href="/guides" className="hover:text-[#1b4332] shrink-0">Guides</Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-[#0f2d22] font-semibold truncate max-w-[180px] sm:max-w-xs">{guide.title}</span>
            </nav>

            <Link
              href="/guides"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1b4332] hover:underline shrink-0 ml-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">All Guides</span>
            </Link>
          </div>
        </div>

        {/* HERO ARTICLE HEADER */}
        <section className="bg-gradient-to-b from-[#0f2d22] to-[#1b4332] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-[#1b4332]/90 border border-[#c5a059]/40 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-bold text-[#c5a059] uppercase tracking-wider shadow-sm">
              <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Official Musky Dose Product Guide</span>
            </div>

            <h1 className="font-momo-display text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-tight">
              {guide.title}
            </h1>

            <p className="text-sm sm:text-base text-[#c5d4cc] leading-relaxed font-sans">
              {guide.shortIntro}
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 pb-16">
          {/* COVER IMAGE */}
          <div className="relative aspect-[16/9] bg-[#f0ebe0] rounded-2xl overflow-hidden border border-[#e8e2d5] shadow-lg mb-8">
            <Image
              src={guide.coverImage || '/images/fallback.svg'}
              alt={guide.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 800px"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* PRIMARY LINKED PRODUCT BANNER / BUYING CTA */}
          {primaryProduct && (
            <div className="bg-white rounded-2xl border-2 border-[#1b4332]/30 p-5 sm:p-6 mb-8 shadow-md relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#c5a059]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-[#f5f1e8] rounded-xl overflow-hidden border border-[#e8e2d5] shrink-0">
                  <Image
                    src={primaryProduct.images?.[0] || '/images/fallback.svg'}
                    alt={primaryProduct.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-grow text-center sm:text-left space-y-1">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#c5a059] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-[#c5a059]" />
                    <span>Featured Product in This Guide</span>
                  </div>
                  <h3 className="font-serif-heading text-base sm:text-lg font-bold text-[#0f2d22]">
                    {primaryProduct.name}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-xs">
                    <span className="font-extrabold text-[#1b4332] text-sm sm:text-base">
                      {formatPrice(primaryProduct.price)}
                    </span>
                    {primaryProduct.quantityOrWeight && (
                      <span className="bg-[#f5f1e8] text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium border border-[#e8e2d5]">
                        {primaryProduct.quantityOrWeight}
                      </span>
                    )}
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      In Stock
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                  <Link
                    href={`/products/${primaryProduct.slug}`}
                    className="w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-sm transition-all"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
                    <span>View Product & Order</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* MAIN ARTICLE CONTENT SECTIONS */}
          <div className="bg-white rounded-2xl border border-[#e8e2d5] p-5 sm:p-8 shadow-xs space-y-8 text-gray-800 leading-relaxed">
            {/* 1. OVERVIEW & WHAT IS THIS */}
            {(guide.whatIsThis || guide.overview) && (
              <section className="space-y-3 pb-6 border-b border-[#f0ebe0]">
                <h2 className="font-serif-heading text-lg sm:text-xl font-bold text-[#0f2d22] flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#c5a059]" />
                  <span>Product Overview & Pure Sojat Quality</span>
                </h2>
                {guide.whatIsThis && (
                  <p className="text-sm text-gray-700 leading-relaxed font-medium bg-[#fcfbf7] p-4 rounded-xl border border-[#e8e2d5]/80">
                    {guide.whatIsThis}
                  </p>
                )}
                {guide.overview && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {guide.overview}
                  </p>
                )}
              </section>
            )}

            {/* 2. KEY BENEFITS */}
            {guide.keyBenefits && guide.keyBenefits.length > 0 && (
              <section className="space-y-3 pb-6 border-b border-[#f0ebe0]">
                <h2 className="font-serif-heading text-lg sm:text-xl font-bold text-[#0f2d22] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Key Botanical Benefits</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {guide.keyBenefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. INGREDIENTS */}
            {guide.ingredients && guide.ingredients.length > 0 && (
              <section className="space-y-3 pb-6 border-b border-[#f0ebe0]">
                <h2 className="font-serif-heading text-lg sm:text-xl font-bold text-[#0f2d22] flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-[#1b4332]" />
                  <span>100% Pure Botanical Ingredients</span>
                </h2>
                <div className="flex flex-wrap gap-2 pt-1">
                  {guide.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f1e8] text-[#1b4332] text-xs font-bold border border-[#e8e2d5]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1b4332]" />
                      <span>{ing}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 4. WHO SHOULD USE / WHO SHOULD AVOID */}
            {(guide.whoShouldUse || guide.whoShouldAvoid) && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#f0ebe0]">
                {guide.whoShouldUse && (
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 space-y-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Who Should Use</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
                      {guide.whoShouldUse}
                    </p>
                  </div>
                )}

                {guide.whoShouldAvoid && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Who Should Avoid</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                      {guide.whoShouldAvoid}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* 5. STEP BY STEP HOW TO USE */}
            {guide.howToUse && (
              <section className="space-y-3 pb-6 border-b border-[#f0ebe0]">
                <h2 className="font-serif-heading text-lg sm:text-xl font-bold text-[#0f2d22] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#c5a059]" />
                  <span>Step-by-Step Application Guide</span>
                </h2>
                <div className="bg-[#faf8f3] p-4 sm:p-5 rounded-xl border border-[#e8e2d5] text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line font-mono sm:font-sans">
                  {guide.howToUse}
                </div>
              </section>
            )}

            {/* 6. QUANTITY, PREPARATION & STORAGE */}
            {(guide.quantityPreparation || guide.storageInstructions) && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#f0ebe0]">
                {guide.quantityPreparation && (
                  <div className="bg-[#f5f1e8] p-4 rounded-xl border border-[#e8e2d5] space-y-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-[#c5a059]" />
                      <span>Recommended Quantity & Prep</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {guide.quantityPreparation}
                    </p>
                  </div>
                )}

                {guide.storageInstructions && (
                  <div className="bg-[#f5f1e8] p-4 rounded-xl border border-[#e8e2d5] space-y-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
                      <span>Storage & Preservation</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {guide.storageInstructions}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* 7. IMPORTANT NOTES */}
            {guide.importantNotes && (
              <section className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 space-y-1">
                <h3 className="font-bold text-xs sm:text-sm text-amber-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>Important Usage Notes</span>
                </h3>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                  {guide.importantNotes}
                </p>
              </section>
            )}

            {/* 8. FAQS */}
            {guide.faqs && guide.faqs.length > 0 && (
              <section className="space-y-4 pt-2">
                <h2 className="font-serif-heading text-lg sm:text-xl font-bold text-[#0f2d22] flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#c5a059]" />
                  <span>Frequently Asked Questions</span>
                </h2>
                <div className="space-y-3">
                  {guide.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] space-y-1"
                    >
                      <h3 className="font-bold text-xs sm:text-sm text-[#0f2d22]">
                        Q: {faq.question}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-[#c5a059]">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* FINAL BUYING CTA */}
          <section className="my-8 bg-gradient-to-br from-[#0f2d22] to-[#1b4332] text-white p-6 sm:p-8 rounded-2xl border border-[#c5a059]/40 text-center space-y-4 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/40 flex items-center justify-center mx-auto text-[#c5a059]">
              <Sparkles className="w-5 h-5" />
            </div>

            <h2 className="font-momo-display text-xl sm:text-3xl font-normal text-white">
              Ready to Experience Fresh Sojat Henna?
            </h2>

            <p className="text-xs sm:text-sm text-[#c5d4cc] max-w-xl mx-auto leading-relaxed">
              Order directly from Musky Dose via WhatsApp. Freshly milled, 100% pure chemical-free stock shipped directly from Sojat, Rajasthan.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={primaryProduct ? `/products/${primaryProduct.slug}` : '/products'}
                className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-7 py-3 rounded-xl font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-md transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>Select Product & Order</span>
              </Link>

              <Link
                href="/products"
                className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-[#c5a059]/40 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors"
              >
                <span>Browse Catalog</span>
              </Link>
            </div>
          </section>

          {/* RELATED PRODUCTS */}
          {displayProducts.length > 0 && (
            <section className="mt-12 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e8e2d5]">
                <h3 className="font-serif-heading text-lg sm:text-xl font-bold text-[#0f2d22]">
                  Products Mentioned in This Guide
                </h3>
                <Link href="/products" className="text-xs font-bold text-[#1b4332] hover:underline">
                  View All Products →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {displayProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    whatsappNumber={whatsappPhone}
                    siteSettings={siteSettings}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer siteSettings={siteSettings} />
    </div>
  );
}
