import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { INITIAL_FAQ_ITEMS } from '@/lib/data-store';
import { FAQItem } from '@/lib/types';
import { safeJsonLd } from '@/lib/utils';
import FaqViewClient from './FaqViewClient';

export const revalidate = 60; // Refresh settings every 60 seconds

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/faq',
    defaultTitle: 'Frequently Asked Questions (FAQ)',
    defaultDescription: 'Common questions about Musky Dose Sojat Henna, Lawsonia Inermis purity, shipping times, and WhatsApp ordering.',
    defaultKeywords: ['Sojat Henna FAQ', 'Musky Dose Questions', 'Henna Powder Help'],
  });
}

export default async function FaqPage() {
  const settings = await getSiteSettings();
  const faqItems: FAQItem[] = settings?.faqItems && settings.faqItems.length > 0 ? settings.faqItems : INITIAL_FAQ_ITEMS;
  const activeFaqs = faqItems
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const faqJsonLd = activeFaqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: activeFaqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : null;

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      <FaqViewClient settings={settings} faqItems={activeFaqs} />
    </>
  );
}
