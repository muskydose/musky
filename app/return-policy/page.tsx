import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import PolicyPageLayout from '@/components/PolicyPageLayout';

export const revalidate = 60;

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/return-policy',
    defaultTitle: 'Return & Refund Policy — Musky Dose Sojat Henna',
    defaultDescription: 'Official Return and Refund Policy for Musky Dose Henna and Herbal Products.',
    defaultKeywords: ['Return Policy', 'Refund Policy', 'Musky Dose Guarantee'],
  });
}

export default async function ReturnPolicyPage() {
  const settings = await getSiteSettings();
  return (
    <PolicyPageLayout
      settings={settings}
      policyKey="returnRefundPolicy"
      defaultTitle="Return & Refund Policy"
    />
  );
}
