import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CategoryCard from '@/components/CategoryCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getCategories } from '@/lib/db/categories';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getCmsText } from '@/lib/cms';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'categories_list',
    targetUrl: '/categories',
    defaultTitle: 'Categories | Musky Dose Sojat Henna',
    defaultDescription: 'Explore our product categories: Sojat Henna, Indigo Hair Care, Damask Rose Face Care, and Raw Herbal Products.',
    defaultKeywords: ['Henna Categories', 'Sojat Henna', 'Indigo Care', 'Face Care Sojat'],
  });
}

export default async function CategoriesPage() {
  const [categories, siteSettings] = await Promise.all([
    getCategories(),
    getSiteSettings(),
  ]);

  const cms = getCmsText(siteSettings);
  const activeCategories = categories
    .filter((cat) => cat.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <Navbar siteSettings={siteSettings} />

      <div className="bg-[#0f2d22] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#2d6a4f]/30">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
            {cms.sojatBadgeText}
          </span>
          <h1 className="font-momo-display text-3xl sm:text-5xl font-normal text-white">
            {cms.categoriesPageTitle}
          </h1>
          <p className="text-sm text-[#b2c8be] max-w-xl mx-auto">
            {cms.categoriesPageSubtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
          {activeCategories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
