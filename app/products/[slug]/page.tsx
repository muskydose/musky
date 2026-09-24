import React from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BookOpen, Leaf, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getProductByIdOrSlug, getRelatedProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getPublishedGuides } from '@/lib/db/guides';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { safeJsonLd } from '@/lib/utils';
import ProductDetailClient from './ProductDetailClient';

import { deriveProductAutoSeo } from '@/lib/growth/product-keyword-engine';
import { resolveCanonicalProductOffer } from '@/lib/growth/product-catalog-governance';
import {
  resolveAuthoritativeProductMedia,
  generateProductMediaSchema,
} from '@/lib/growth/product-media-governance';
import { getPrimaryMedia, isSafeInternalMediaUrl } from '@/lib/db/media';
import {
  getRelatedGuidesForProduct,
  getRelatedKnowledgeForProduct,
} from '@/lib/growth/entity-relationships';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductByIdOrSlug(slug);
  if (!product || product.isActive === false) return { title: 'Product Not Found' };

  const autoSeo = deriveProductAutoSeo(product);
  const primaryMedia = await getPrimaryMedia({
    entityType: 'PRODUCT',
    entityId: product.id,
  });
  const rawPrimary = primaryMedia.url || (product as any)?.canonicalPrimaryUrl;
  const primaryImgUrl = isSafeInternalMediaUrl(rawPrimary) && !rawPrimary.includes('fallback.svg') ? rawPrimary : undefined;

  return await resolvePageSeoMetadata({
    targetType: 'product',
    targetId: product.id,
    targetUrl: `/products/${product.slug}`,
    defaultTitle: product.seoTitle ? product.seoTitle.replace(/\s*\|\s*Musky\s*Dose.*$/i, '').trim() : autoSeo.seoTitle,
    defaultDescription: product.seoDescription || autoSeo.metaDescription,
    defaultImage: primaryImgUrl,
    defaultKeywords: [
      ...(product.seoKeywords || []),
      autoSeo.primaryKeyword,
      ...autoSeo.secondaryKeywords,
    ],
    robotsIndex: product.robotsIndex ?? true,
    robotsFollow: product.robotsFollow ?? true,
    ogImage: primaryImgUrl,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, siteSettings, categories, allGuides] = await Promise.all([
    getProductByIdOrSlug(slug),
    getSiteSettings(),
    getCategories(),
    getPublishedGuides(),
  ]);

  if (!product || product.isActive === false) {
    notFound();
  }

  // A product can retain an old Google-discovered URL after its catalog slug is
  // normalized or extended. Resolve the product first, then permanently redirect
  // only when the resolved canonical slug is different.
  const requestedSlug = decodeURIComponent(slug).trim().toLowerCase();
  if (product.slug.trim().toLowerCase() !== requestedSlug) {
    permanentRedirect(`/products/${product.slug}`);
  }

  // Canonical universal relationship resolution (approved or high-confidence contextual matches)
  const [relevantGuides, relevantKnowledge] = await Promise.all([
    getRelatedGuidesForProduct(product, {
      allGuides,
      requireApproval: false,
      includeDrafts: false,
      limit: 2,
    }),
    getRelatedKnowledgeForProduct(product, {
      requireApproval: false,
      limit: 2,
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
  const relatedProducts = await getRelatedProducts(product.id, product.categoryId, 3);
  const matchedCategory = categories.find(
    (c) => (product.categoryId && c.id === product.categoryId) || (product.categoryName && c.name === product.categoryName)
  );

  const breadcrumbElements: Array<{ '@type': string; position: number; name: string; item: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl,
    },
  ];

  if (matchedCategory) {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 2,
      name: matchedCategory.name,
      item: `${baseUrl}/categories/${matchedCategory.slug}`,
    });
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 3,
      name: product.name,
      item: `${baseUrl}/products/${product.slug}`,
    });
  } else {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Products',
      item: `${baseUrl}/products`,
    });
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 3,
      name: product.name,
      item: `${baseUrl}/products/${product.slug}`,
    });
  }

  const autoSeo = deriveProductAutoSeo(product);
  const canonicalOffer = resolveCanonicalProductOffer(product);
  const mediaSchema = generateProductMediaSchema(product, baseUrl);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${baseUrl}/products/${product.slug}#product`,
        name: product.name,
        image: mediaSchema.images.length > 0 ? mediaSchema.images : undefined,
        description: product.fullDescription && product.fullDescription.length > 50 ? product.fullDescription : autoSeo.metaDescription,
        sku: canonicalOffer.sku,
        brand: {
          '@type': 'Brand',
          name: siteSettings?.brandName || 'Musky Dose',
        },
        offers: {
          '@type': 'Offer',
          url: `${baseUrl}/products/${product.slug}`,
          priceCurrency: 'INR',
          price: canonicalOffer.price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: product.stockStatus === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: siteSettings?.brandName || 'Musky Dose',
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'IN',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 7,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
            url: `${baseUrl}/return-policy`,
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: Number(siteSettings?.shippingFee ?? 0),
              currency: 'INR',
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'IN',
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: {
                '@type': 'QuantitativeValue',
                minValue: 1,
                maxValue: 2,
                unitCode: 'DAY',
              },
              transitTime: {
                '@type': 'QuantitativeValue',
                minValue: 2,
                maxValue: 5,
                unitCode: 'DAY',
              },
            },
          },
        },
      },
      ...mediaSchema.videos,
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbElements,
      },
      ...(product.slug === 'baq-henna-powder'
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${baseUrl}/products/${product.slug}#faq`,
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What does BAQ (Body Art Quality) Henna Powder mean?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BAQ stands for Body Art Quality. It designates the highest grade of Lawsonia Inermis, harvested from top-tier leaves in Sojat, Rajasthan, and triple micro-cloth sifted through 0.05mm mesh to produce a silky, clog-free powder with maximum lawsone dye release.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Can BAQ Henna also be used for hair conditioning?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, absolutely. BAQ Henna creates an ultra-smooth, lump-free hair pack that rinses out cleanly with plain water, conditioning hair cuticles naturally.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Does Musky Dose BAQ Henna contain PPD, chemicals, or synthetic dyes?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'No. Musky Dose BAQ Henna is 100% pure Lawsonia Inermis with zero PPD, zero ammonia, zero metallic salts, and zero synthetic preservatives.',
                  },
                },
              ],
            },
          ]
        : []),
      ...(product.slug === 'natural-organic-indigo-powder'
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${baseUrl}/products/${product.slug}#faq`,
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Do you supply Indigo powder in bulk / wholesale commercial quantities?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Musky Dose supplies commercial wholesale batches of pure Indigofera Tinctoria powder in 1kg vacuum packs, 5kg sacks, and 25kg bulk mandi bags direct from Sojat factory.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How do I use Indigo powder for 100% natural black hair (grey coverage)?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Indigo is applied as Step 2 after a pure Henna base application. Step 1 deposits reddish lawsone, and Step 2 binds indigo to produce permanent natural jet black without chemical dyes.',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Navbar siteSettings={siteSettings} />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <ProductDetailClient
          product={product}
          whatsappNumber={getConfiguredWhatsAppNumber(siteSettings)}
          whatsappTemplate={siteSettings.whatsappMessageTemplate}
          brandName={siteSettings.brandName || 'Musky Dose'}
          faqItems={siteSettings.faqItems}
          relevantGuides={relevantGuides}
          categoryName={matchedCategory?.name || product.categoryName}
        />

        {/* Botanical Ritual Guides & Botanical Knowledge Section */}
        {((relevantGuides && relevantGuides.length > 0) || (relevantKnowledge && relevantKnowledge.length > 0)) && (
          <div className="mt-16 pt-10 border-t border-[#e8e2d5]">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-[#c5a059] uppercase tracking-widest">
                  BOTANICAL USAGE & RITUALS
                </span>
                <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22] mt-1">
                  Preparation Rituals & Botanical Guides
                </h2>
              </div>
              <Link href="/guides" className="text-xs font-bold text-[#1b4332] hover:underline shrink-0">
                Explore All Guides →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relevantGuides?.map((guide: any) => (
                <Link
                  key={guide.id}
                  href={`/guides/${guide.slug}`}
                  className="p-5 rounded-2xl bg-white border border-[#e8e2d5] hover:border-[#1b4332] transition-colors shadow-xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f5f1e8] text-[#1b4332] text-[11px] font-bold">
                      <BookOpen className="w-3 h-3 text-[#c5a059]" />
                      <span>Ritual Guide</span>
                    </span>
                    <h3 className="font-momo-display text-lg font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                      {guide.title}
                    </h3>
                    {guide.shortIntro && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {guide.shortIntro}
                      </p>
                    )}
                  </div>
                  <div className="pt-4 flex items-center text-xs font-bold text-[#1b4332] group-hover:translate-x-1 transition-transform">
                    <span>Read Preparation Ritual</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Link>
              ))}
              {relevantKnowledge?.map((k: any) => (
                <Link
                  key={k.id}
                  href={`/knowledge/${k.slug}`}
                  className="p-5 rounded-2xl bg-white border border-[#e8e2d5] hover:border-[#1b4332] transition-colors shadow-xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                      <Leaf className="w-3 h-3 text-emerald-600" />
                      <span>Botanical Origin</span>
                    </span>
                    <h3 className="font-momo-display text-lg font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                      {k.title}
                    </h3>
                    {k.shortSummary && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {k.shortSummary}
                      </p>
                    )}
                  </div>
                  <div className="pt-4 flex items-center text-xs font-bold text-[#1b4332] group-hover:translate-x-1 transition-transform">
                    <span>Explore Herb Origin</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-[#e8e2d5]">
            <div className="mb-8">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-widest">
                MORE FROM SOJAT
              </span>
              <h2 className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22] mt-1">
                You May Also Like
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 lg:gap-8">
              {relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  categories={categories}
                  siteSettings={siteSettings}
                  whatsappNumber={getConfiguredWhatsAppNumber(siteSettings)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
