import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getProducts } from '@/lib/db/products';
import { getPublishedGuides } from '@/lib/db/guides';
import { getCategories } from '@/lib/db/categories';
import { safeJsonLd } from '@/lib/utils';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
  resolveCanonicalEntity,
  getPublicIndexableEntities,
} from '@/lib/growth/entity-registry';
import {
  ENTITY_KEY_TO_SLUG,
  SLUG_TO_ENTITY_KEY,
  HENNA_ALIAS_SLUGS,
  getCanonicalKnowledgeUrl,
} from '@/lib/growth/search-intent-router';
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

export async function generateStaticParams() {
  return getPublicIndexableEntities()
    .map((record) => {
      const slug = ENTITY_KEY_TO_SLUG[record.entityKey];
      return slug ? { entity: slug } : null;
    })
    .filter((p): p is { entity: string } => p !== null);
}

export async function generateMetadata(props: KnowledgePageProps): Promise<Metadata> {
  const { entity } = await props.params;
  const slug = entity.toLowerCase().trim();

  // Alias canonicalization
  if (HENNA_ALIAS_SLUGS.has(slug)) {
    return {
      title: 'Henna / Mehndi (Lawsonia inermis) | Musky Dose',
      description: 'Redirecting to canonical Henna / Mehndi knowledge page.',
      alternates: {
        canonical: 'https://muskydose.in/knowledge/henna-mehndi',
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const entityKey = SLUG_TO_ENTITY_KEY[slug];
  if (!entityKey) {
    return {
      title: 'Knowledge Base | Musky Dose',
      robots: { index: false, follow: false },
    };
  }

  const record = getEntity(entityKey);
  if (!record || record.status === 'UNKNOWN') {
    return {
      title: 'Entity Not Found | Musky Dose',
      robots: { index: false, follow: false },
    };
  }

  const isIndexable = record.status === 'KNOWN';
  const canonicalUrl = `https://muskydose.in/knowledge/${slug}`;
  const title = `${record.canonicalName}${record.scientificName ? ` (${record.scientificName})` : ''} | Botanical Care & Sourcing — Musky Dose`;
  const description = `${record.description} Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.`;

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
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Musky Dose',
      type: 'article',
      locale: 'en_IN',
    },
  };
}

export default async function KnowledgeEntityPage(props: KnowledgePageProps) {
  const { entity } = await props.params;
  const slug = entity.toLowerCase().trim();

  // 1. Permanent redirect for all regional/spelling aliases of Henna
  if (HENNA_ALIAS_SLUGS.has(slug)) {
    redirect('/knowledge/henna-mehndi');
  }

  // 2. Resolve canonical entity key
  const entityKey = SLUG_TO_ENTITY_KEY[slug];
  if (!entityKey) {
    notFound();
  }

  const record = getEntity(entityKey);
  if (!record || record.status === 'UNKNOWN') {
    notFound();
  }

  // 3. Query active products, published guides, and categories
  const [allProducts, allGuides, allCategories] = await Promise.all([
    getProducts(),
    getPublishedGuides(),
    getCategories(),
  ]);

  // Build internal link graph
  const linkGraph = buildEntityInternalGraph({
    entityKey,
    products: allProducts,
    categories: allCategories,
    guides: allGuides,
  });

  // Filter products matching entity
  const matchingProducts = allProducts.filter((p) => {
    if (p.isActive === false) return false;
    const resolved = resolveCanonicalEntity(p);
    return resolved.entityKey === entityKey;
  });

  // Filter published guides mentioning entity
  const matchingGuides = allGuides.filter((g) => {
    const gSlug = g.slug.toLowerCase();
    const gTitle = g.title.toLowerCase();
    return record.normalizedAliases.some((a) => gSlug.includes(a) || gTitle.includes(a));
  });

  const canonicalUrl = `https://muskydose.in/knowledge/${slug}`;

  // Structured Data (AboutPage + ItemPage)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: record.canonicalName,
    description: record.description,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'Thing',
      name: record.canonicalName,
      alternateName: record.aliases,
      ...(record.scientificName ? { scientificName: record.scientificName } : {}),
      description: record.description,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Musky Dose',
      url: 'https://muskydose.in',
      logo: 'https://muskydose.in/icon-512.png',
    },
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
        name: 'Botanical Knowledge',
        item: 'https://muskydose.in/knowledge/henna-mehndi',
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
              <span className="text-neutral-500">Knowledge Hub</span>
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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <Leaf className="h-3.5 w-3.5" />
                  Botanical Knowledge
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {record.productFamily.replace(/_/g, ' ')}
                </span>
                {record.status === 'KNOWN' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Entity
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                {record.canonicalName}
              </h1>

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

              <p className="mt-4 text-base leading-relaxed text-neutral-750 sm:text-lg">
                {record.description}
              </p>

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

