import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import PolicyPageLayout from '@/components/PolicyPageLayout';

export const revalidate = 60;

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/privacy-policy',
    defaultTitle: 'Privacy Policy — Musky Dose Sojat Henna',
    defaultDescription: 'Official Privacy Policy for Musky Dose Henna and Herbal Products.',
    defaultKeywords: ['Privacy Policy', 'Musky Dose', 'Henna Data Safety'],
  });
}

export default async function PrivacyPolicyPage() {
  const settings = await getSiteSettings();
  return (
    <PolicyPageLayout
      settings={settings}
      policyKey="privacyPolicy"
      defaultTitle="Privacy Policy"
    />
  );
}
