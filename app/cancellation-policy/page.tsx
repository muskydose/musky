import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import PolicyPageLayout from '@/components/PolicyPageLayout';

export const revalidate = 60;

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/cancellation-policy',
    defaultTitle: 'Cancellation Policy — Musky Dose Sojat Henna',
    defaultDescription: 'Official Cancellation Policy for Musky Dose Henna and Herbal Products.',
    defaultKeywords: ['Cancellation Policy', 'Musky Dose Order Cancellation'],
  });
}

export default async function CancellationPolicyPage() {
  const settings = await getSiteSettings();
  return (
    <PolicyPageLayout
      settings={settings}
      policyKey="cancellationPolicy"
      defaultTitle="Cancellation Policy"
    />
  );
}
