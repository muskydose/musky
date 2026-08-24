import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import CartViewClient from './CartViewClient';
import { getSiteSettings } from '@/lib/db/settings';
import { getCmsText } from '@/lib/cms';

export const metadata = {
  title: 'Shopping Cart | Musky Dose — Sojat Henna & Herbal Care',
  description: 'View your selected Musky Dose Sojat Henna and natural botanical products in your cart and proceed to secure checkout.',
  alternates: {
    canonical: 'https://muskydose.in/cart',
  },
};

export default async function CartPage() {
  const siteSettings = await getSiteSettings();
  const cms = getCmsText(siteSettings);

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <Navbar siteSettings={siteSettings} />

      {/* Header Banner */}
      <div className="bg-[#0f2d22] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-[#2d6a4f]/30">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
            {cms.sojatBadgeText}
          </span>
          <h1 className="font-momo-display text-3xl sm:text-4xl font-normal text-white">
            {cms.cartTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#b2c8be] max-w-xl mx-auto">
            {cms.cartEmptyDescription}
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CartViewClient siteSettings={siteSettings} />
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
