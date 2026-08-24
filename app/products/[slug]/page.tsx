import React from 'react';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getProductByIdOrSlug, getRelatedProducts } from '@/lib/db/products';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { safeJsonLd } from '@/lib/utils';
import ProductDetailClient from './ProductDetailClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductByIdOrSlug(slug);
  if (!product || product.isActive === false) return { title: 'Product Not Found | Musky Dose' };

  return await resolvePageSeoMetadata({
    targetType: 'product',
    targetId: product.id,
    targetUrl: `/products/${product.slug}`,
    defaultTitle: `${product.name} | Musky Dose — Pure Sojat Mehendi`,
    defaultDescription:
      product.shortDescription ||
      product.fullDescription?.slice(0, 160) ||
      'Pure organic henna and natural herbal products from Sojat, Rajasthan.',
    defaultImage: product.images?.[0] || '/images/fallback.svg',
    defaultKeywords: [
      product.name,
      product.categoryName || 'Henna',
      'Sojat Henna',
      'Musky Dose',
    ],
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, siteSettings] = await Promise.all([
    getProductByIdOrSlug(slug),
    getSiteSettings(),
  ]);

  if (!product || product.isActive === false) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.id, product.categoryId, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `https://muskydose.in/products/${product.slug}#product`,
        name: product.name,
        image: product.images?.[0],
        description: product.fullDescription || product.shortDescription,
        sku: product.sku || product.id,
        brand: {
          '@type': 'Brand',
          name: 'Musky Dose',
        },
        offers: {
          '@type': 'Offer',
          url: `https://muskydose.in/products/${product.slug}`,
          priceCurrency: 'INR',
          price: product.price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: product.stockStatus === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'Musky Dose',
          },
        },
      },
      {
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
            name: 'Products',
            item: 'https://muskydose.in/products',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.name,
            item: `https://muskydose.in/products/${product.slug}`,
          },
        ],
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
