import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { getCmsText } from '@/lib/cms';
import { safeJsonLd } from '@/lib/utils';
import ProductsClientView from './ProductsClientView';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'products_list',
    targetUrl: '/products',
    defaultTitle: 'All Products | Musky Dose — Pure Sojat Henna & Herbal Care',
    defaultDescription: 'Browse our complete range of pure natural Sojat Henna powder, Indigo, Amla Reetha Shikakai hair packs, and Damask rose water spray.',
    defaultKeywords: ['Musky Dose Products', 'Sojat Henna Catalog', 'Herbal Hair Care', 'Natural Mehendi'],
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [products, categories, siteSettings, resolvedSearchParams] = await Promise.all([
    getProducts(),
    getCategories(),
    getSiteSettings(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  const rawCategory = typeof resolvedSearchParams?.category === 'string'
    ? resolvedSearchParams.category
    : Array.isArray(resolvedSearchParams?.category)
    ? resolvedSearchParams.category[0]
    : undefined;

  const rawSearch = typeof resolvedSearchParams?.search === 'string'
    ? resolvedSearchParams.search
    : typeof resolvedSearchParams?.q === 'string'
    ? resolvedSearchParams.q
    : Array.isArray(resolvedSearchParams?.search)
    ? resolvedSearchParams.search[0]
    : Array.isArray(resolvedSearchParams?.q)
    ? resolvedSearchParams.q[0]
    : undefined;

  const cms = getCmsText(siteSettings);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  const matchedCategory = rawCategory && rawCategory !== 'all'
    ? categories.find(
        (c) =>
          c.id.toLowerCase() === rawCategory.toLowerCase() ||
          c.slug.toLowerCase() === rawCategory.toLowerCase() ||
          c.name.toLowerCase() === rawCategory.toLowerCase()
      )
    : undefined;

  const seoProducts = matchedCategory
    ? products.filter(
        (p) =>
          p.categoryId === matchedCategory.id ||
          p.categoryId === matchedCategory.slug ||
          (p.categoryName && p.categoryName.toLowerCase() === matchedCategory.name.toLowerCase())
      )
    : products;

  const collectionUrl = matchedCategory
    ? `${baseUrl}/products?category=${matchedCategory.slug}`
    : `${baseUrl}/products`;

  const pageTitle = matchedCategory
    ? `${matchedCategory.name} Products | ${cms.productsPageTitle}`
    : cms.productsPageTitle;

  const jsonLdCollection = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: pageTitle,
        url: collectionUrl,
        description: matchedCategory?.description || cms.productsPageSubtitle,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: seoProducts.map((prod, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${baseUrl}/products/${prod.slug}`,
            name: prod.name,
          })),
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdCollection) }}
      />
      <Navbar siteSettings={siteSettings} />

      {/* Page Header */}
      <div className="bg-[#0f2d22] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#2d6a4f]/30">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
            {cms.sojatBadgeText}
          </span>
          <h1 className="font-momo-display text-3xl sm:text-5xl font-normal text-white">
            {cms.productsPageTitle}
          </h1>
          <p className="text-sm text-[#b2c8be] max-w-xl mx-auto">
            {cms.productsPageSubtitle}
          </p>
        </div>
      </div>

      {/* Client Filter View */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProductsClientView
          initialProducts={products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            stockStatus: p.stockStatus,
            isFeatured: p.isFeatured,
            isBestSeller: p.isBestSeller,
            categoryId: p.categoryId,
            categoryName: p.categoryName || '',
            images: p.images && p.images.length > 0 ? [p.images[0]] : ['/images/fallback.svg'],
            shortDescription: p.shortDescription || '',
            quantityOrWeight: p.quantityOrWeight || '',
            productType: p.productType,
            sortOrder: p.sortOrder,
            isActive: p.isActive,
          })) as unknown as typeof products}
          categories={categories}
          initialCategory={rawCategory}
          initialSearch={rawSearch}
          whatsappNumber={getConfiguredWhatsAppNumber(siteSettings)}
          siteSettings={siteSettings}
        />
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
