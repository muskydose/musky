import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import PolicyPageLayout from '@/components/PolicyPageLayout';

export const revalidate = 60;

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'other',
    targetUrl: '/shipping-policy',
    defaultTitle: 'Shipping & Delivery Policy — Musky Dose Sojat Henna',
    defaultDescription: 'Learn about Musky Dose shipping charges, courier dispatch times from Sojat, Rajasthan, and tracking details.',
    defaultKeywords: ['Shipping Policy', 'Musky Dose Shipping', 'Delivery Terms'],
  });
}

export default async function ShippingPolicyPage() {
  const settings = await getSiteSettings();
  return (
    <PolicyPageLayout
      settings={settings}
      policyKey="shippingPolicy"
      defaultTitle="Shipping & Delivery Policy"
    />
  );
}
