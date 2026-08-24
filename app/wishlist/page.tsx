import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import WishlistViewClient from './WishlistViewClient';
import { getSiteSettings } from '@/lib/db/settings';

export const metadata = {
  title: 'My Saved Wishlist | Musky Dose — Sojat Henna',
  description: 'View your saved favorite Musky Dose Sojat Henna and botanical products.',
  alternates: {
    canonical: 'https://muskydose.in/wishlist',
  },
};

export default async function WishlistPage() {
  const siteSettings = await getSiteSettings();

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <Navbar siteSettings={siteSettings} />

      {/* Header Banner */}
      <div className="bg-[#0f2d22] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-[#2d6a4f]/30">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <span className="text-rose-400 text-xs font-bold uppercase tracking-widest">
            Saved Favorites
          </span>
          <h1 className="font-momo-display text-3xl sm:text-4xl font-normal text-white">
            Your Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-[#b2c8be] max-w-xl mx-auto">
            Your personal selection of favorite Sojat Henna and natural botanical items saved for easy ordering.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <WishlistViewClient />
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
