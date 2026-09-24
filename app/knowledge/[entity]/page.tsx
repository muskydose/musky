import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import Badge from '@/components/ui/Badge';
import Heading from '@/components/ui/Heading';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import { getProducts } from '@/lib/db/products';
import { getPublishedGuides } from '@/lib/db/guides';
import { getCategories } from '@/lib/db/categories';
import { safeJsonLd } from '@/lib/utils';
import {
  getKnowledgeBySlug,
  getPublishedKnowledgeEntities,
  KnowledgeEntity,
} from '@/lib/db/knowledge';
import { getPrimaryMedia, isSafeInternalMediaUrl } from '@/lib/db/media';
import {
  getRelatedProductsForKnowledge,
  getRelatedGuidesForKnowledge,
} from '@/lib/growth/entity-relationships';
import { buildEntityInternalGraph } from '@/lib/growth/internal-link-graph';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Leaf,
  Layers,
  ChevronRight,
  Building2,
  HelpCircle,
  ShoppingBag,
} from 'lucide-react';

interface KnowledgePageProps {
  params: Promise<{
    entity: string;
  }>;
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const entities = await getPublishedKnowledgeEntities();
  return entities.map((record) => ({
    entity: record.slug,
  }));
}

export async function generateMetadata(props: KnowledgePageProps): Promise<Metadata> {
  const { entity } = await props.params;
  const slug = entity.toLowerCase().trim();

  const lookup = await getKnowledgeBySlug(slug);

  if (lookup.isRedirect && lookup.redirectCanonicalSlug) {
    const canonicalUrl = `https://muskydose.in/knowledge/${lookup.redirectCanonicalSlug}`;
    return {
      title: `${lookup.entity?.canonicalName || 'Knowledge Base'} | Musky Dose`,
      description: `Redirecting to canonical ${lookup.entity?.canonicalName || ''} knowledge page.`,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const record = lookup.entity;
  if (!record || !record.published || record.dbStatus !== 'published' || record.entityKey === 'UNKNOWN') {
    return {
      title: 'Entity Not Found | Musky Dose',
      robots: { index: false, follow: false },
    };
  }

  const isIndexable = record.robotsIndex;
  const canonicalUrl = `https://muskydose.in/knowledge/${record.slug}`;
  const title = record.seoTitle || `${record.canonicalName}${record.scientificName ? ` (${record.scientificName})` : ''} | Botanical Care & Sourcing — Musky Dose`;
  const description = record.seoDescription || `${record.description} Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.`;

  const primaryMedia = await getPrimaryMedia({
    entityType: 'KNOWLEDGE',
    entityId: record.id || record.entityKey,
  });

  return {
    metadataBase: new URL('https://muskydose.in'),
    title,
    description,
    keywords: record.aliases,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: isIndexable,
      follow: record.robotsFollow,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Musky Dose',
      type: 'article',
      locale: 'en_IN',
      ...(() => {
        const ogCandidate = primaryMedia.url || (isSafeInternalMediaUrl(record.ogImageUrl) ? record.ogImageUrl : undefined);
        const ogUrl = isSafeInternalMediaUrl(ogCandidate) ? ogCandidate : undefined;
        return ogUrl ? { images: [{ url: ogUrl }] } : {};
      })(),
    },
  };
}

export default async function KnowledgeEntityPage(props: KnowledgePageProps) {
  const { entity } = await props.params;
  const slug = entity.toLowerCase().trim();

  // 1. Resolve knowledge entity via canonical DAL (handles exact slug & dynamic redirect_slugs)
  const lookup = await getKnowledgeBySlug(slug);

  if (lookup.isRedirect && lookup.redirectCanonicalSlug) {
    redirect(`/knowledge/${lookup.redirectCanonicalSlug}`);
  }

  const record = lookup.entity;
  if (!record || !record.published || record.dbStatus !== 'published' || record.entityKey === 'UNKNOWN') {
    notFound();
  }

  // 2. Query active products, published guides, and categories
  const [allProducts, allGuides, allCategories] = await Promise.all([
    getProducts(),
    getPublishedGuides(),
    getCategories(),
  ]);

  // Build internal link graph
  const linkGraph = buildEntityInternalGraph({
    entityKey: record.entityKey,
    products: allProducts,
    categories: allCategories,
    guides: allGuides,
  });

  // Canonical universal relationship resolution (approved or high-confidence contextual matches)
  const [matchingProducts, matchingGuides] = await Promise.all([
    getRelatedProductsForKnowledge(record, {
      allProducts,
      requireApproval: false,
      limit: 12,
    }),
    getRelatedGuidesForKnowledge(record, {
      allGuides,
      requireApproval: false,
      includeDrafts: false,
      limit: 6,
    }),
  ]);

  const [canonicalUrl, primaryMedia] = await Promise.all([
    Promise.resolve(`https://muskydose.in/knowledge/${record.slug}`),
    getPrimaryMedia({
      entityType: 'KNOWLEDGE',
      entityId: record.id || record.entityKey,
    }),
  ]);

  const imgCandidate = primaryMedia.url || (isSafeInternalMediaUrl(record.ogImageUrl) ? record.ogImageUrl : undefined);
  const resolvedImage = isSafeInternalMediaUrl(imgCandidate) ? imgCandidate : undefined;

  const knowledgeFaqs = record.entityKey === 'HENNA_MEHNDI' ? [
    {
      question: 'Can we eat henna leaves?',
      answer: 'No. Henna (Lawsonia inermis) leaves and powder are exclusively formulated for external cosmetic and topical application on skin, hair, and nails. Henna must never be eaten, ingested, or brewed as tea. Internal consumption is unsafe and can lead to acute gastrointestinal distress, oxidative hemolysis (especially in individuals with G6PD enzyme deficiency), and systemic toxicity.',
    },
    {
      question: 'What is the English name for Mehndi / Maruthani?',
      answer: 'The English name for Mehndi (Hindi/Urdu) and Maruthani (Tamil) is Henna. In botanical taxonomy, the plant is scientifically classified as Lawsonia inermis, belonging to the Lythraceae flowering plant family.',
    },
    {
      question: 'What is Mehndi / Henna made of?',
      answer: 'Pure Mehndi is made from the dried, finely pulverized green leaves of the Lawsonia inermis shrub. Its coloring property comes from lawsone (2-hydroxy-1,4-naphthoquinone), a naturally occurring botanical tannin that binds harmlessly to skin and hair keratin without artificial chemicals, PPD, or synthetic developers.',
    },
    {
      question: 'What does BAQ (Body Art Quality) Henna mean?',
      answer: 'Body Art Quality (BAQ) Henna designates the highest commercial purity grade of henna powder. Harvested from top-tier leaves in Sojat, Rajasthan, it is shade-dried and micro-cloth sifted up to three times (0.05mm). This guarantees an ultra-fine, fiber-free powder that will never clog precision applicator cones, yielding deep mahogany stains.',
    },
  ] : [];

  // Structured Data (AboutPage + FAQPage)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        name: record.canonicalName,
        description: record.description,
        url: canonicalUrl,
        ...(resolvedImage ? { image: resolvedImage } : {}),
        mainEntity: {
          '@type': 'Thing',
          name: record.canonicalName,
          alternateName: record.aliases,
          ...(record.scientificName ? { scientificName: record.scientificName } : {}),
          description: record.description,
          ...(resolvedImage ? { image: resolvedImage } : {}),
        },
        publisher: {
          '@type': 'Organization',
          name: 'Musky Dose',
          url: 'https://muskydose.in',
          logo: 'https://muskydose.in/icon-512.png',
        },
      },
      ...(knowledgeFaqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${canonicalUrl}#faq`,
              mainEntity: knowledgeFaqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://muskydose.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Botanical Knowledge Hub',
        item: 'https://muskydose.in/knowledge',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: record.canonicalName,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen bg-neutral-50 pb-20 text-neutral-900">
        {/* Breadcrumb Navigation */}
        <div className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <nav className="flex items-center space-x-2 text-xs text-neutral-500 sm:text-sm">
              <Link href="/" className="hover:text-emerald-700">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              <Link href="/knowledge" className="hover:text-emerald-700">
                Botanical Knowledge
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              <span className="font-semibold text-neutral-900">{record.canonicalName}</span>
            </nav>
          </div>
        </div>

        {/* Hero Section */}
        <div className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="leaf" size="md">
                  <Leaf className="h-3.5 w-3.5" />
                  Botanical Knowledge
                </Badge>
                <Badge variant="neutral" size="md">
                  {record.productFamily.replace(/_/g, ' ')}
                </Badge>
                {record.status === 'KNOWN' && (
                  <Badge variant="forest" size="md">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Entity
                  </Badge>
                )}
              </div>

              <Heading level="h1" className="text-forest tracking-tight">
                {record.canonicalName}
              </Heading>

              {record.scientificName && (
                <p className="mt-2 text-lg font-serif italic text-emerald-800 sm:text-xl">
                  {record.scientificName}
                  {record.botanicalFamily && (
                    <span className="not-italic text-sm text-neutral-500 ml-2">
                      (Family: {record.botanicalFamily})
                    </span>
                  )}
                </p>
              )}

              <Text variant="lead" className="mt-4 text-forest/80 font-normal">
                {record.description}
              </Text>

              {/* Scopes Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Supported Scopes:
                </span>
                {record.supportedScopes.map((scope) => (
                  <span
                    key={scope}
                    className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800 border border-neutral-200"
                  >
                    {scope.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
          {/* Section: Natural Aliases & Nomenclature */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Recognized Regional Names & Aliases
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Across different languages and traditions, {record.canonicalName} is known by various names. All terms refer strictly to this single botanical identity.
            </p>
            {record.entityKey === 'HENNA_MEHNDI' ? (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">English</span>
                  <span className="font-bold text-sm text-neutral-900 block mt-0.5">Henna</span>
                  <span className="text-[11px] text-neutral-500">Mignonette tree</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Hindi / Urdu</span>
                  <span className="font-bold text-sm text-neutral-900 block mt-0.5">Mehndi</span>
                  <span className="text-[11px] text-neutral-500 font-sans">मेहंदी / مہندی</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Tamil</span>
                  <span className="font-bold text-sm text-emerald-900 block mt-0.5">Maruthani</span>
                  <span className="text-[11px] text-emerald-700 font-sans">மருதாணி</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Sanskrit</span>
                  <span className="font-bold text-sm text-neutral-900 block mt-0.5">Madayantika</span>
                  <span className="text-[11px] text-neutral-500 font-sans">मदयन्तिका</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Telugu</span>
                  <span className="font-bold text-sm text-neutral-900 block mt-0.5">Gorintaku</span>
                  <span className="text-[11px] text-neutral-500 font-sans">గోరింటాకు</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Malayalam</span>
                  <span className="font-bold text-sm text-neutral-900 block mt-0.5">Mailanchi</span>
                  <span className="text-[11px] text-neutral-500 font-sans">മയിലാഞ്ചി</span>
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {record.aliases.map((alias) => (
                <span
                  key={alias}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 border border-emerald-100 capitalize"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>

          {/* Section: Safe Traditional Use Cases */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Verified & Safe Application Domains
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Musky Dose adheres strictly to verified botanical capabilities without medicinal or cure claims.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {record.safeUseCases.map((useCase, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4"
                >
                  <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-neutral-800 leading-snug">{useCase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Essential Botanical Questions & Safety FAQ */}
          {knowledgeFaqs.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 mb-2">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Botanical Safety & Common Queries
                </div>
                <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
                  Frequently Asked Botanical Questions
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Verified factual information regarding {record.canonicalName} nomenclature, composition, and safe external use.
                </p>
              </div>

              <div className="space-y-4">
                {knowledgeFaqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2"
                  >
                    <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        Q
                      </span>
                      <span>{faq.question}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed pl-7">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Related Musky Dose Products */}
          {matchingProducts.length > 0 && (
            <div>
              <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6 text-emerald-600" />
                    Authentic {record.canonicalName} Products
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Single-origin batches directly crafted and tested in Sojat, Rajasthan.
                  </p>
                </div>
                <Link
                  href={`/products?search=${encodeURIComponent(record.canonicalName)}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
                >
                  View All Products <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {matchingProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>
          )}

          {/* Section: Related Guides */}
          {matchingGuides.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    Essential Guides & Recipes
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Truth-grounded step-by-step application, storage, and preparation guides.
                  </p>
                </div>
                <Link
                  href="/guides"
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  All Guides <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchingGuides.map((guide) => (
                  <Link
                    key={guide.id || guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 transition hover:border-emerald-500 hover:bg-white hover:shadow-sm"
                  >
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        {guide.category || 'Preparation Guide'}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-neutral-900 group-hover:text-emerald-700">
                        {guide.title}
                      </h3>
                      {guide.shortIntro && (
                        <p className="mt-2 line-clamp-2 text-xs text-neutral-600">
                          {guide.shortIntro}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700">
                      Read Guide <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section: Related Botanical Entities */}
          {linkGraph && linkGraph.relatedEntities.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Related Botanical Knowledge Entities
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Botanicals traditionally used alongside or complementary to {record.canonicalName}.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {linkGraph.relatedEntities.map((rel) => (
                  <Link
                    key={rel.key}
                    href={rel.url}
                    className="group rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center transition hover:border-emerald-600 hover:bg-white hover:shadow-sm"
                  >
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                      <Leaf className="h-5 w-5" />
                    </div>
                    <span className="block text-sm font-semibold text-neutral-900 group-hover:text-emerald-700">
                      {rel.name}
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">Explore Entity &rarr;</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section: Wholesale & Factory Direct Callout */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50/40 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 mb-2">
                  <Building2 className="h-3.5 w-3.5" />
                  B2B & Bulk Supply
                </div>
                <h3 className="text-xl font-bold text-neutral-900 sm:text-2xl">
                  Bulk & Wholesale Sourcing for {record.canonicalName}
                </h3>
                <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
                  Looking for commercial quantities, salon packs, or private label manufacturing? Musky Dose provides factory-direct batch certificates and Pan-India dispatch from Sojat, Rajasthan.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {record.entityKey === 'HENNA_MEHNDI' && (
                  <Link
                    href="/sojat-henna"
                    className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-center text-xs font-bold text-neutral-800 shadow-sm hover:bg-neutral-50 transition"
                  >
                    Sojat Henna Origin Hub
                  </Link>
                )}
                <Link
                  href="/wholesale"
                  className="rounded-xl bg-emerald-800 px-6 py-2.5 text-center text-xs font-bold text-white shadow-sm hover:bg-emerald-900 transition"
                >
                  Wholesale Enquiry
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppFloat />
    </>
  );
}

