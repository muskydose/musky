import React from 'react';
import WholesaleClient from './WholesaleClient';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getSiteSettings } from '@/lib/db/settings';
import { safeJsonLd } from '@/lib/utils';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'wholesale',
    targetUrl: '/wholesale',
    defaultTitle: 'Sojat Henna Wholesale & Bulk Supply | Factory Manufacturer Rajasthan',
    defaultDescription:
      'Direct factory wholesale supply of authentic Sojat henna powder, BAQ bridal mehndi cones, and botanical herbs. Pan-India dispatch for salons, mehndi artists, resellers, and bulk buyers.',
    defaultKeywords: [
      'Wholesale Henna',
      'Mehndi Wholesale',
      'Sojat Henna Supplier',
      'Bulk Henna Powder',
      'Henna Manufacturer Rajasthan',
      'Henna for Salons',
      'Henna for Mehndi Artists',
      'B2B Henna India',
      'Bulk Mehendi Cones',
      'Sojat Mehendi Mandi Rate',
    ],
  });
}

export default async function WholesalePage() {
  const siteSettings = await getSiteSettings();
  const baseUrl = siteSettings?.websiteUrl || 'https://muskydose.in';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/wholesale#webpage`,
        url: `${baseUrl}/wholesale`,
        name: 'Sojat Henna Wholesale & Bulk Supply | Factory Direct B2B Portal',
        description:
          'Direct factory wholesale supply of authentic Sojat henna powder, bridal mehndi cones, and herbal botanicals from Sojat, Rajasthan.',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        about: {
          '@id': `${baseUrl}/#localbusiness`,
        },
        breadcrumb: {
          '@id': `${baseUrl}/wholesale#breadcrumb`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/wholesale#breadcrumb`,
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
            name: 'Wholesale & Bulk Supply',
            item: `${baseUrl}/wholesale`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/wholesale#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is the minimum wholesale order quantity (MOQ)?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Wholesale orders start at 5kg for packaged retail sizes and 25kg for bulk commercial sacks. Smaller trial samples can be requested through our sales team.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do you supply genuine Sojat-grown henna powder?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. All our Lawsonia Inermis henna is cultivated and processed directly in Sojat City, Pali district, Rajasthan — known globally for high natural Lawsone dye content.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do you deliver wholesale orders Pan-India?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. We provide insured, trackable commercial dispatch across all states and union territories in India via trusted surface and express freight partners.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can salons and bridal mehndi artists get custom bulk rates?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. We have dedicated volume discount tiers for professional mehndi artists and beauty salons requiring smooth, triple-cloth-sifted BAQ henna powder.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <WholesaleClient />
    </>
  );
}
