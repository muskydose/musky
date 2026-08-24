'use client';

import React from 'react';
import { SeoKeyword, PageSeoConfig, SiteSettings, Product, Category, ProductGuide, CustomPage } from '@/lib/types';
import {
  TrendingUp,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Target,
  BarChart2,
  Globe,
} from 'lucide-react';

interface SeoDashboardTabProps {
  keywords: SeoKeyword[];
  pageConfigs: PageSeoConfig[];
  products: Product[];
  categories: Category[];
  guides: ProductGuide[];
  customPages: CustomPage[];
  siteSettings: SiteSettings;
  onNavigateTab: (tab: 'keywords' | 'page_seo' | 'sitemap' | 'indexing') => void;
}

export default function SeoDashboardTab({
  keywords,
  pageConfigs,
  products,
  categories,
  guides,
  customPages,
  siteSettings,
  onNavigateTab,
}: SeoDashboardTabProps) {
  const activeKeywords = keywords.filter((k) => k.active);
  const primaryKeywords = keywords.filter((k) => k.isPrimary);
  const highPriorityKeywords = keywords.filter((k) => k.priority === 'HIGH');
  const configuredPages = pageConfigs.filter((p) => p.seoTitle && p.metaDescription);
  const isGscVerified = !!siteSettings.googleSearchConsoleVerification;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
            <span>Active Keywords</span>
            <Search className="w-4 h-4 text-[#183F2B]" />
          </div>
          <div className="text-2xl font-bold text-[#0f2d22]">{activeKeywords.length}</div>
          <p className="text-[11px] text-[#626c66]">{primaryKeywords.length} primary targets</p>
        </div>

        <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
            <span>Configured Meta Pages</span>
            <FileText className="w-4 h-4 text-[#183F2B]" />
          </div>
          <div className="text-2xl font-bold text-[#0f2d22]">{configuredPages.length}</div>
          <p className="text-[11px] text-[#626c66]">{pageConfigs.length} total indexed pages</p>
        </div>

        <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
            <span>High Priority Keywords</span>
            <Target className="w-4 h-4 text-[#9A4F32]" />
          </div>
          <div className="text-2xl font-bold text-[#9A4F32]">{highPriorityKeywords.length}</div>
          <p className="text-[11px] text-[#626c66]">Targeting key buyer intent</p>
        </div>

        <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
            <span>Google Verification</span>
            <ShieldCheck className={`w-4 h-4 ${isGscVerified ? 'text-emerald-600' : 'text-amber-500'}`} />
          </div>
          <div className={`text-lg font-bold ${isGscVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isGscVerified ? 'Verified Active' : 'Setup Required'}
          </div>
          <p className="text-[11px] text-[#626c66]">
            {isGscVerified ? 'Tag configured' : 'Add verification token'}
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0f2d22]">
            <Search className="w-4 h-4 text-[#183F2B]" />
            <span>Keyword Management</span>
          </div>
          <p className="text-xs text-[#626c66] leading-relaxed">
            Target high-intent keywords like &quot;sojat henna powder&quot;, &quot;pure rajasthani mehendi&quot;, and natural herbal hair powders.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('keywords')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#183F2B] hover:underline cursor-pointer"
          >
            <span>Manage Keywords ({keywords.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0f2d22]">
            <FileText className="w-4 h-4 text-[#183F2B]" />
            <span>Page Meta Snippets</span>
          </div>
          <p className="text-xs text-[#626c66] leading-relaxed">
            Customize search titles, meta descriptions, OpenGraph social previews, and robots indexing flags for every page.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('page_seo')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#183F2B] hover:underline cursor-pointer"
          >
            <span>Configure Page Meta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0f2d22]">
            <Globe className="w-4 h-4 text-[#183F2B]" />
            <span>Sitemap & Search Console</span>
          </div>
          <p className="text-xs text-[#626c66] leading-relaxed">
            Automatically generate dynamic XML sitemaps for {products.length} products, {categories.length} categories, {guides.length} guides, and verify indexing.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('sitemap')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#183F2B] hover:underline cursor-pointer"
          >
            <span>View XML Sitemap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
