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
    defaultTitle: 'Official Business Certificates, GST & Enterprise Compliance',
    defaultDescription:
      'Official GST, MSME Enterprise Registrations & Processing Compliance for Musky Dose pure Sojat Henna.',
    defaultKeywords: ['GST Certificate', 'MSME Registration', 'Sojat Henna Compliance', 'Business Documents'],
  });
}

export default async function DocumentsPage() {
  const items = await getPublishedBusinessContentItems();
  const settings = await getSiteSettings();

  return <DocumentsClient initialItems={items} siteSettings={settings} />;
}

