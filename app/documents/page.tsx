import React from 'react';
import DocumentsClient from './DocumentsClient';
import { getPublishedBusinessContentItems } from '@/lib/db/business-content';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';

export async function generateMetadata() {
  const settings = await getSiteSettings();

  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/documents',
    defaultTitle: `Business Certificates, GST, FSSAI & Lab Reports | ${settings.brandName || 'Musky Dose'}`,
    defaultDescription:
      'Verified GST registration, FSSAI license, ISO 9001:2015 quality certificate, and NABL lab analysis COA reports for Musky Dose pure Sojat Henna.',
    defaultKeywords: ['GST Certificate', 'FSSAI License', 'ISO Certificate', 'NABL COA Report', 'Sojat Henna Documents'],
  });
}

export default async function DocumentsPage() {
  const items = await getPublishedBusinessContentItems();
  const settings = await getSiteSettings();

  return <DocumentsClient initialItems={items} siteSettings={settings} />;
}

