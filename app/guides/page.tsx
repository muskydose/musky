import React from 'react';
import Metadata from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Search, ArrowRight, Sparkles, CheckCircle2, Leaf, ShieldCheck } from 'lucide-react';
import { getPublishedGuides } from '@/lib/db/guides';
import { getSiteSettings } from '@/lib/db/settings';
import { getProducts } from '@/lib/db/products';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getBatchPrimaryMedia, isSafeInternalMediaUrl } from '@/lib/db/media';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Container from '@/components/ui/Container';
import Section from '@/components/ui/Section';
import Heading from '@/components/ui/Heading';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ImageFrame from '@/components/ui/ImageFrame';
import EmptyState from '@/components/ui/EmptyState';

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

  const guideMediaMap = await getBatchPrimaryMedia('GUIDE', guides.map((g) => g.id));
  const activeProducts = products.filter((p) => p.isActive !== false);

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col font-sans">
      <Navbar siteSettings={siteSettings} />

      <main className="flex-grow">
        {/* HERO HEADER */}
        <Section background="forest" spacing="lg" className="text-white relative overflow-hidden">
          <Container size="lg" className="text-center relative z-10 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5">
              <Badge variant="gold" size="md">
                <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Sojat Botanical Knowledge Base</span>
              </Badge>
            </div>

            <Heading level="h1" className="text-white leading-tight">
              Musky Dose Product Guides & Herbal Instructions
            </Heading>

            <Text variant="lead" className="text-[#c5d4cc] max-w-2xl mx-auto leading-relaxed">
              Master dye release times, powder ratios, and step-by-step application techniques for 100% natural, unadulterated Sojat Henna and botanical remedies.
            </Text>
          </Container>
        </Section>

        {/* MAIN GUIDES GRID */}
        <Section background="canvas" spacing="lg">
          <Container size="xl">
            <div className="flex items-center justify-between mb-6 sm:mb-8 pb-3 border-b border-[#e8e2d5]">
              <div>
                <Heading level="h2" className="text-forest">
                  Featured Product Guides ({guides.length})
                </Heading>
                <Text variant="bodySm" className="text-forest/70 mt-0.5">
                  Detailed step-by-step instructions for pure Sojat Henna, Indigo, and botanical care.
                </Text>
              </div>
            </div>

            {guides.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-full h-full stroke-[1.5]" />}
                title="No published guides available yet."
                description="Check back soon for new herbal application tutorials."
                size="md"
                className="max-w-md mx-auto my-8"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map((guide) => {
                  const linkedProduct = guide.productId
                    ? activeProducts.find((p) => p.id === guide.productId)
                    : null;
                  const candidate = guideMediaMap.get(guide.id)?.url || (guide as any)?.canonicalPrimaryUrl || guide.coverImage;
                  const coverSrc = isSafeInternalMediaUrl(candidate) ? candidate! : '/images/fallback.svg';

                  return (
                    <Card
                      key={guide.id}
                      hoverLift={true}
                      className="overflow-hidden flex flex-col group h-full"
                    >
                      {/* Cover Image */}
                      <Link href={`/guides/${guide.slug}`} className="relative aspect-[16/9] bg-canvas overflow-hidden block">
                        <ImageFrame
                          src={coverSrc}
                          alt={guide.title}
                          aspectRatio="16:9"
                          zoomOnHover={true}
                        />
                        <div className="absolute top-3 left-3 z-10">
                          <Badge variant="forest" size="sm">
                            Product Guide
                          </Badge>
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-grow space-y-3">
                        {linkedProduct && (
                          <div className="inline-flex items-center gap-1.5">
                            <Badge variant="leaf" size="sm">
                              <Leaf className="w-3 h-3 text-leaf" />
                              <span>For {linkedProduct.name}</span>
                            </Badge>
                          </div>
                        )}

                        <Link href={`/guides/${guide.slug}`} className="block group/title">
                          <Heading level="h4" className="text-forest group-hover/title:text-leaf transition-colors leading-snug line-clamp-2">
                            {guide.title}
                          </Heading>
                        </Link>

                        <Text variant="bodySm" className="text-forest/70 leading-relaxed line-clamp-3 flex-grow font-sans">
                          {guide.shortIntro}
                        </Text>

                        {/* Footer CTA */}
                        <div className="pt-3 border-t border-border-neutral/60 flex items-center justify-between">
                          <Badge variant="gold" size="sm">
                            Sojat Formula
                          </Badge>
                          <Link
                            href={`/guides/${guide.slug}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-leaf group-hover:translate-x-1 transition-all"
                          >
                            <span>Read Guide</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gold" />
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Container>
        </Section>

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
