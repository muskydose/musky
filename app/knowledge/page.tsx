import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getPublishedKnowledgeEntities } from '@/lib/db/knowledge';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { safeJsonLd } from '@/lib/utils';
import { Leaf, ArrowRight, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Heading from '@/components/ui/Heading';
import Text from '@/components/ui/Text';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = settings.brandName || 'Musky Dose';

  return await resolvePageSeoMetadata({
    targetType: 'knowledge_hub',
    targetUrl: '/knowledge',
    defaultTitle: `Botanical Knowledge Hub & Herbal Directory | ${siteName}`,
    defaultDescription:
      'Explore verified botanical profiles, scientific classifications, Ayurvedic uses, and direct Rajasthani sourcing for pure Sojat Henna, Indigo, Amla, and traditional herbs.',
    defaultKeywords: [
      'Botanical Knowledge Base',
      'Sojat Henna Botanical Guide',
      'Lawsonia Inermis Scientific Profile',
      'Indigofera Tinctoria',
      'Ayurvedic Herbs Rajasthan',
      'Pure Henna Guide',
    ],
  });
}

export default async function KnowledgeHubPage() {
  const [entities, siteSettings] = await Promise.all([
    getPublishedKnowledgeEntities(),
    getSiteSettings().catch(() => undefined),
  ]);

  const activeEntities = entities.filter(
    (e) => e.published && e.dbStatus === 'published' && e.entityKey !== 'UNKNOWN' && e.robotsIndex !== false
  );

  const baseUrl = siteSettings?.websiteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${baseUrl}/knowledge#collection`,
        url: `${baseUrl}/knowledge`,
        name: 'Botanical Knowledge Hub & Herbal Directory | Musky Dose',
        description:
          'Comprehensive botanical encyclopedia covering traditional Rajasthani herbs, scientific classifications, dye properties, and safe application rituals.',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        breadcrumb: {
          '@id': `${baseUrl}/knowledge#breadcrumb`,
        },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: activeEntities.map((ent, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `${baseUrl}/knowledge/${ent.slug}`,
            name: ent.canonicalName,
            description: ent.description,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/knowledge#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Botanical Knowledge Hub',
            item: `${baseUrl}/knowledge`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#1f2421] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Navbar siteSettings={siteSettings} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="bg-[#0f2d22] text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-[#2d6a4f]/30">
          <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5">
              <Badge variant="gold" size="md">
                <Leaf className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Rajasthani Botanical Index</span>
              </Badge>
            </div>

            <Heading level="h1" className="text-white text-3xl sm:text-5xl font-normal leading-tight font-momo-display">
              Botanical Knowledge Hub
            </Heading>

            <Text variant="lead" className="text-[#c5d4cc] max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
              Verified botanical classifications, traditional Ayurvedic benefits, active phytocompounds, and sustainable sourcing direct from Sojat, Rajasthan.
            </Text>
          </div>
        </section>

        {/* BREADCRUMB STRIP */}
        <div className="border-b border-[#e8e2d5] bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <nav className="flex items-center space-x-2 text-xs text-[#556059]">
              <Link href="/" className="hover:text-[#1b4332] transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="font-semibold text-[#0f2d22]">Botanical Knowledge Hub</span>
            </nav>
          </div>
        </div>

        {/* MAIN BOTANICAL GRID */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#e8e2d5] gap-4">
            <div>
              <span className="text-xs font-semibold text-[#c5a059] uppercase tracking-wider">Species & Herbs</span>
              <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22]">
                Published Botanical Profiles ({activeEntities.length})
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#556059] max-w-md">
              Every herb is thoroughly documented with botanical names, traditional uses, and chemical-free preparation guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeEntities.map((entity) => (
              <Link
                key={entity.id || entity.slug}
                href={`/knowledge/${entity.slug}`}
                className="group bg-white rounded-2xl border border-[#e8e2d5] p-6 hover:border-[#1b4332] hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-[#f4ede2] text-[#8c6b2d] text-[11px] font-bold uppercase tracking-wider">
                      {entity.productFamily ? entity.productFamily.replace(/_/g, ' ') : 'BOTANICAL'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#1b4332] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1b4332]" /> Verified
                    </span>
                  </div>

                  <div>
                    <h3 className="font-momo-display text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                      {entity.canonicalName}
                    </h3>
                    {entity.scientificName && (
                      <p className="text-xs italic text-[#7a857f] font-serif mt-0.5">
                        {entity.scientificName}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-[#556059] leading-relaxed line-clamp-3">
                    {entity.description}
                  </p>

                  {entity.aliases && entity.aliases.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-semibold text-[#8c948f] tracking-wider block mb-1">
                        Also known as:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {entity.aliases.slice(0, 3).map((alias, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-[#f2f0eb] text-[#4a544e]"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-4 border-t border-[#f0ede6] flex items-center justify-between text-xs font-bold text-[#1b4332] group-hover:translate-x-0.5 transition-transform">
                  <span>Explore Botanical Profile</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>

          {/* APPLICATION & HERITAGE BANNER */}
          <div className="mt-16 bg-gradient-to-r from-[#0f2d22] to-[#1b4332] rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-[#2d5a45] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />
                Application Rituals
              </div>
              <h3 className="font-momo-display text-2xl sm:text-3xl font-normal text-white">
                Looking for Step-by-Step Mixing & Dye Tutorials?
              </h3>
              <p className="text-xs sm:text-sm text-[#b2c8be] leading-relaxed">
                Discover exact mixing ratios, dye release temperatures, and two-step hair coloring methods in our comprehensive guide collection.
              </p>
            </div>
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 bg-[#c5a059] hover:bg-[#b08d46] text-[#0f2d22] px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all shrink-0"
            >
              <span>Browse Guides</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
