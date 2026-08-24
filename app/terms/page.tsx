import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import PolicyPageLayout from '@/components/PolicyPageLayout';

export const revalidate = 60;

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/terms',
    defaultTitle: 'Terms & Conditions — Musky Dose Sojat Henna',
    defaultDescription: 'Terms & Conditions for using the Musky Dose website and ordering Sojat Henna products.',
    defaultKeywords: ['Terms and Conditions', 'Musky Dose', 'Henna Store Terms'],
  });
}

export default async function TermsPage() {
  const settings = await getSiteSettings();
  return (
    <PolicyPageLayout
      settings={settings}
      policyKey="termsConditions"
      defaultTitle="Terms & Conditions"
    />
  );
}
