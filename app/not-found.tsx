import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getSiteSettings } from '@/lib/db/settings';
import { getCmsText } from '@/lib/cms';
import { Leaf, Home } from 'lucide-react';

export default async function NotFound() {
  const settings = await getSiteSettings();
  const cms = getCmsText(settings);

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <Navbar siteSettings={settings} />
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-20 flex flex-col items-center justify-center text-center my-auto">
        <div className="w-16 h-16 rounded-full bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center mb-6 border border-[#e8e2d5]">
          <Leaf className="w-8 h-8 text-[#1b4332]" />
        </div>
        <span className="text-[#c5a059] font-bold text-xs uppercase tracking-widest mb-2">
          {cms.notFoundBadgeText}
        </span>
        <h1 className="font-serif-heading text-4xl sm:text-5xl font-extrabold text-[#0f2d22] mb-4">
          {cms.notFoundTitle}
        </h1>
        <p className="text-sm text-[#626c66] max-w-md mx-auto mb-8 leading-relaxed">
          {cms.notFoundDescription}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-6 py-3 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22] transition-colors"
          >
            <Home className="w-4 h-4 text-[#c5a059]" />
            <span>{cms.notFoundButtonText}</span>
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-[#f5f1e8] text-[#0f2d22] px-6 py-3 rounded-xl font-bold text-xs border border-[#e8e2d5] hover:bg-[#e8e2d5] transition-colors"
          >
            <span>{cms.notFoundExploreButtonText}</span>
          </Link>
        </div>
      </div>
      <Footer siteSettings={settings} />
      <WhatsAppFloat />
    </div>
  );
}
