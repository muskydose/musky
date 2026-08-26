import React from 'react';
import WholesaleClient from './WholesaleClient';
import { resolvePageSeoMetadata } from '@/lib/db/seo';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'wholesale',
    targetUrl: '/wholesale',
    defaultTitle: 'Wholesale & B2B Bulk Henna Supply | Musky Dose Sojat',
    defaultDescription: 'Order premium ultra-fine sifted Sojat henna powder and herbal products in bulk quantities directly from our factory in Sojat, Rajasthan.',
    defaultKeywords: ['Wholesale Henna', 'B2B Sojat Henna', 'Bulk Mehendi Powder', 'Henna Manufacturer Rajasthan'],
  });
}

export default function WholesalePage() {
  return <WholesaleClient />;
}
