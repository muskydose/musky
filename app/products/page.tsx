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

export default async function ProductsPage() {
  const [products, categories, siteSettings] = await Promise.all([
    getProducts(),
    getCategories(),
    getSiteSettings(),
  ]);

  const cms = getCmsText(siteSettings);

  const jsonLdCollection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cms.productsPageTitle,
    url: 'https://muskydose.in/products',
    description: cms.productsPageSubtitle,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.map((prod, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://muskydose.in/products/${prod.slug}`,
        name: prod.name,
      })),
    },
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
          initialProducts={products}
          categories={categories}
          whatsappNumber={getConfiguredWhatsAppNumber(siteSettings)}
          siteSettings={siteSettings}
        />
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
