import React from 'react';
import Metadata from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Search, ArrowRight, Sparkles, CheckCircle2, Leaf, ShieldCheck } from 'lucide-react';
import { getPublishedGuides } from '@/lib/db/guides';
import { getSiteSettings } from '@/lib/db/settings';
import { getProducts } from '@/lib/db/products';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60; // Revalidate every 60s

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = settings.brandName || 'Musky Dose';
  return await resolvePageSeoMetadata({
    targetType: 'guides_list',
    targetUrl: '/guides',
    defaultTitle: `Product Guides & Herbal Care Knowledge | ${siteName}`,
    defaultDescription: `Learn how to use 100% pure Sojat Henna, Indigo, and herbal hair powders. Comprehensive mixing, dye release, and application guides from Musky Dose.`,
    defaultKeywords: ['Henna Guides', 'Sojat Henna How To', 'Natural Dye Release', 'Indigo Care Tips'],
  });
}

export default async function ProductGuidesPage() {
  const [guides, siteSettings, products] = await Promise.all([
    getPublishedGuides(),
    getSiteSettings(),
    getProducts(),
  ]);

  const activeProducts = products.filter((p) => p.isActive !== false);

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col font-sans">
      <Navbar siteSettings={siteSettings} />

      <main className="flex-grow">
        {/* HERO HEADER */}
        <section className="bg-gradient-to-b from-[#0f2d22] to-[#1b4332] text-white pt-8 pb-12 sm:pt-12 sm:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="max-w-5xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-[#1b4332]/90 border border-[#c5a059]/40 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-bold text-[#c5a059] uppercase tracking-wider shadow-sm">
              <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Sojat Botanical Knowledge Base</span>
            </div>

            <h1 className="font-momo-display text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-tight">
              Musky Dose Product Guides & Herbal Instructions
            </h1>

            <p className="text-xs sm:text-base text-[#c5d4cc] max-w-2xl mx-auto leading-relaxed">
              Master dye release times, powder ratios, and step-by-step application techniques for 100% natural, unadulterated Sojat Henna and botanical remedies.
            </p>
          </div>
        </section>

        {/* MAIN GUIDES GRID */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
          <div className="flex items-center justify-between mb-6 sm:mb-8 pb-3 border-b border-[#e8e2d5]">
            <div>
              <h2 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#0f2d22]">
                Featured Product Guides ({guides.length})
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Detailed step-by-step instructions for pure Sojat Henna, Indigo, and botanical care.
              </p>
            </div>
          </div>

          {guides.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#e8e2d5] max-w-md mx-auto my-8">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No published guides available yet.</p>
              <p className="text-xs text-gray-500 mt-1">Check back soon for new herbal application tutorials.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guides.map((guide) => {
                const linkedProduct = guide.productId
                  ? activeProducts.find((p) => p.id === guide.productId)
                  : null;

                return (
                  <article
                    key={guide.id}
                    className="bg-white rounded-2xl border border-[#e8e2d5] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                  >
                    {/* Cover Image */}
                    <Link href={`/guides/${guide.slug}`} className="relative aspect-[16/9] bg-[#f0ebe0] overflow-hidden block">
                      <Image
                        src={guide.coverImage || '/images/fallback.svg'}
                        alt={guide.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-[#0f2d22]/90 backdrop-blur-md text-[#c5a059] text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-[#c5a059]/30">
                        Product Guide
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow space-y-3">
                      {linkedProduct && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1b4332] bg-[#f5f1e8] px-2.5 py-1 rounded-lg w-fit border border-[#e8e2d5]">
                          <Leaf className="w-3 h-3 text-[#1b4332]" />
                          <span>For {linkedProduct.name}</span>
                        </div>
                      )}

                      <h3 className="font-serif-heading text-base sm:text-lg font-bold text-[#0f2d22] group-hover:text-[#1b4332] transition-colors leading-snug line-clamp-2">
                        <Link href={`/guides/${guide.slug}`}>
                          {guide.title}
                        </Link>
                      </h3>

                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3 flex-grow">
                        {guide.shortIntro}
                      </p>

                      {/* Footer CTA */}
                      <div className="pt-3 border-t border-[#f0ebe0] flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#c5a059] uppercase tracking-wider">
                          Sojat Formula
                        </span>
                        <Link
                          href={`/guides/${guide.slug}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] group-hover:translate-x-1 transition-all"
                        >
                          <span>Read Guide</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* WHY TRUST MUSKY DOSE GUIDES */}
        <section className="bg-[#f5f1e8] border-y border-[#e8e2d5] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <h2 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#0f2d22]">
              Why Follow Musky Dose Herbal Guides?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
              <div className="bg-white p-5 rounded-xl border border-[#e8e2d5] shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-[#c5a059] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#0f2d22]">Direct Sojat Expertise</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Our guides are formulated directly from Sojat farmers and traditional Mehendi craft masters.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#e8e2d5] shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-[#c5a059] flex items-center justify-center font-bold">
                  <Leaf className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#0f2d22]">100% Natural Ratios</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  No hidden metallic salts or chemical additives. Learn exact water and lemon dye-release ratios.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#e8e2d5] shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-[#c5a059] flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#0f2d22]">Verified Results</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Achieve rich mahogany stain on skin and long-lasting chemical-free coverage on grey hair.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer siteSettings={siteSettings} />
    </div>
  );
}
