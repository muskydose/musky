import React from 'react';
import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import OffersClient from '@/components/OffersClient';
import { getCampaigns } from '@/lib/db/campaigns';
import { getProducts } from '@/lib/db/products';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { safeJsonLd } from '@/lib/utils';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = settings.brandName || 'Musky Dose';

  return await resolvePageSeoMetadata({
    targetType: 'offers',
    targetUrl: '/offers',
    defaultTitle: `Special Offers, Festival Discounts & Coupons | ${siteName}`,
    defaultDescription:
      'Exclusive festival coupons, bulk combo deals, and seasonal discounts on pure Sojat Henna powder, organic indigo, and herbal hair care from Musky Dose.',
    defaultKeywords: [
      'Henna Offers',
      'Mehndi Coupons',
      'Sojat Henna Discount',
      'Festival Offers',
      'Indigo Powder Deal',
      'Musky Dose Offers',
    ],
  });
}

export default async function OffersPage() {
  const [campaigns, products, siteSettings] = await Promise.all([
    getCampaigns().catch(() => []),
    getProducts().catch(() => []),
    getSiteSettings().catch(() => undefined),
  ]);

  const baseUrl = siteSettings?.websiteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/offers#webpage`,
        url: `${baseUrl}/offers`,
        name: 'Special Offers & Festival Discounts | Musky Dose',
        description:
          'Discover active coupons, seasonal savings, and bulk discounts on authentic Sojat henna and botanical hair care.',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        breadcrumb: {
          '@id': `${baseUrl}/offers#breadcrumb`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/offers#breadcrumb`,
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
            name: 'Special Offers',
            item: `${baseUrl}/offers`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f9f6f0] text-[#1f2421] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Navbar siteSettings={siteSettings} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <OffersClient
          campaigns={campaigns}
          products={products}
          siteSettings={siteSettings}
        />
      </main>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
