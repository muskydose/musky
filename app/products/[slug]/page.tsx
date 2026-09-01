import React from 'react';
import { notFound } from 'next/navigation';
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

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductByIdOrSlug(slug);
  if (!product || product.isActive === false) return { title: 'Product Not Found' };

  const autoSeo = deriveProductAutoSeo(product);

  return await resolvePageSeoMetadata({
    targetType: 'product',
    targetId: product.id,
    targetUrl: `/products/${product.slug}`,
    defaultTitle: product.seoTitle ? product.seoTitle.replace(/\s*\|\s*Musky\s*Dose.*$/i, '').trim() : autoSeo.seoTitle,
    defaultDescription: product.seoDescription || autoSeo.metaDescription,
    defaultImage: product.ogImageUrl || product.images?.[0] || '/images/fallback.svg',
    defaultKeywords: [
      ...(product.seoKeywords || []),
      autoSeo.primaryKeyword,
      ...autoSeo.secondaryKeywords,
    ],
    robotsIndex: product.robotsIndex ?? true,
    robotsFollow: product.robotsFollow ?? true,
    ogImage: product.ogImageUrl || product.images?.[0],
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

  const prodNameLower = (product.name || '').toLowerCase();
  const prodSlugLower = (product.slug || '').toLowerCase();
  const catNameLower = (product.categoryName || '').toLowerCase();

  const relevantGuides = allGuides.filter((g) => {
    if (g.productId === product.id) return true;
    if (Array.isArray(g.productIds) && g.productIds.includes(product.id)) return true;
    if (Array.isArray(g.relatedProductIds) && g.relatedProductIds.includes(product.id)) return true;
    
    // Topic matching
    if ((prodNameLower.includes('indigo') || prodSlugLower.includes('indigo')) && g.slug.includes('indigo')) return true;
    if ((prodNameLower.includes('henna') || prodSlugLower.includes('henna') || catNameLower.includes('henna')) && g.slug.includes('henna')) return true;
    if ((prodNameLower.includes('amla') || prodNameLower.includes('hair pack')) && g.slug.includes('which-henna')) return true;
    
    return false;
  }).slice(0, 2);

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${baseUrl}/products/${product.slug}#product`,
        name: product.name,
        image: product.images?.[0] ? (product.images[0].startsWith('http') ? product.images[0] : `${baseUrl}${product.images[0]}`) : undefined,
        description: product.fullDescription && product.fullDescription.length > 50 ? product.fullDescription : autoSeo.metaDescription,
        sku: product.sku || product.id,
        brand: {
          '@type': 'Brand',
          name: siteSettings?.brandName || 'Musky Dose',
        },
        offers: {
          '@type': 'Offer',
          url: `${baseUrl}/products/${product.slug}`,
          priceCurrency: 'INR',
          price: product.price,
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
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbElements,
      },
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
        />

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
