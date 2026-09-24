import React from 'react';
import DocumentsClient from './DocumentsClient';
import { getPublishedBusinessContentItems } from '@/lib/db/business-content';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';

import { safeJsonLd } from '@/lib/utils';

export async function generateMetadata() {
  const settings = await getSiteSettings();

  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/documents',
    defaultTitle: 'Official Business Certificates, GST & Enterprise Compliance',
    defaultDescription:
      'Official GST, MSME Enterprise Registrations & Processing Compliance for Musky Dose pure Sojat Henna.',
    defaultKeywords: ['GST Certificate', 'MSME Registration', 'Sojat Henna Compliance', 'Business Documents'],
  });
}

export default async function DocumentsPage() {
  const items = await getPublishedBusinessContentItems();
  const settings = await getSiteSettings();
  const baseUrl = settings.websiteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/documents#webpage`,
        url: `${baseUrl}/documents`,
        name: 'Official Business Certificates, GST & Enterprise Compliance',
        description: 'Official GST, MSME Enterprise Registrations & Processing Compliance for Musky Dose pure Sojat Henna.',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/documents#breadcrumb`,
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
            name: 'Certificates & Documents',
            item: `${baseUrl}/documents`,
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
      <DocumentsClient initialItems={items} siteSettings={settings} />
    </>
  );
}

