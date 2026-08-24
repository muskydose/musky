'use client';

import React, { useState } from 'react';
import { SeoKeyword, PageSeoConfig, SiteSettings, Product, Category, ProductGuide, CustomPage } from '@/lib/types';
import {
  TrendingUp,
  Search,
  FileText,
  FileCode,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import SeoDashboardTab from '@/components/admin/seo/tabs/SeoDashboardTab';
import SeoKeywordsTab from '@/components/admin/seo/tabs/SeoKeywordsTab';
import SeoPageConfigTab from '@/components/admin/seo/tabs/SeoPageConfigTab';
import SeoSitemapTab from '@/components/admin/seo/tabs/SeoSitemapTab';
import SeoIndexingVerificationTab from '@/components/admin/seo/tabs/SeoIndexingVerificationTab';

interface AdminSeoClientProps {
  initialKeywords: SeoKeyword[];
  initialPageConfigs: PageSeoConfig[];
  products: Product[];
  categories: Category[];
  guides: ProductGuide[];
  customPages: CustomPage[];
  siteSettings: SiteSettings;
}

export default function AdminSeoClient({
  initialKeywords,
  initialPageConfigs,
  products,
  categories,
  guides,
  customPages,
  siteSettings: initialSiteSettings,
}: AdminSeoClientProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'keywords' | 'page_seo' | 'sitemap' | 'indexing'>('dashboard');
  const [keywords, setKeywords] = useState<SeoKeyword[]>(initialKeywords);
  const [pageConfigs, setPageConfigs] = useState<PageSeoConfig[]>(initialPageConfigs);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveKeyword = async (keyword: Partial<SeoKeyword>) => {
    const res = await fetch('/api/admin/seo-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keyword),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save keyword.');
    }
    const saved = data.data?.keyword || data.keyword;
    setKeywords((prev) => {
      const idx = prev.findIndex((k) => k.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    showNotification('success', 'Keyword saved successfully.');
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!window.confirm('Delete this SEO target keyword?')) return;
    const res = await fetch(`/api/admin/seo-keywords?id=${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete keyword.');
    }
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    showNotification('success', 'Keyword deleted successfully.');
  };

  const handleExportKeywords = () => {
    window.open('/api/admin/seo-keywords/export', '_blank');
  };

  const handleImportKeywords = async (file: File) => {
    const text = await file.text();
    const res = await fetch('/api/admin/seo-keywords/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to import keywords.');
    }
    // Refresh keywords list
    const refreshRes = await fetch('/api/admin/seo-keywords');
    const refreshData = await refreshRes.json();
    if (refreshData.success) {
      setKeywords(refreshData.data?.keywords || refreshData.keywords || []);
    }
    showNotification('success', 'Keywords imported successfully.');
  };

  const handleSavePageConfig = async (config: PageSeoConfig) => {
    const res = await fetch('/api/admin/page-seo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save page SEO configuration.');
    }
    const saved = data.data?.config || data.config;
    setPageConfigs((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    showNotification('success', 'Page SEO configuration saved.');
  };

  const handleSaveSiteSettings = async (updates: Partial<SiteSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSettings: { ...siteSettings, ...updates } }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save SEO settings.');
    }
    const updated = data.data?.siteSettings || data.siteSettings;
    setSiteSettings(updated);
    showNotification('success', 'SEO site settings saved.');
  };

  const tabs = [
    { id: 'dashboard', label: 'SEO Dashboard & Audits', icon: TrendingUp },
    { id: 'keywords', label: 'Keyword Target Hub', icon: Search, badge: keywords.length },
    { id: 'page_seo', label: 'Page Meta & Titles', icon: FileText, badge: pageConfigs.length },
    { id: 'sitemap', label: 'XML Sitemap & Robots', icon: FileCode },
    { id: 'indexing', label: 'Google Search Console', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e8e2d5] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#183F2B]">SEO & Google Indexing</h1>
          <p className="text-sm text-[#626c66] mt-1">
            Manage target organic keywords, page meta tags, OpenGraph previews, XML sitemaps, and Google Search Console verification.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm border ${
            notification.type === 'success'
              ? 'bg-[#e8f3ed] border-[#2d6a4f]/20 text-[#2d6a4f]'
              : 'bg-[#9A4F32]/10 border-[#9A4F32]/20 text-[#9A4F32]'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-[#e8e2d5] bg-[#FAF8F5] p-1.5 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[#183F2B] shadow-sm font-semibold'
                  : 'text-[#626c66] hover:text-[#183F2B] hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#183F2B]' : 'text-[#626c66]'}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-[#183F2B] text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <SeoDashboardTab
            keywords={keywords}
            pageConfigs={pageConfigs}
            products={products}
            categories={categories}
            guides={guides}
            customPages={customPages}
            siteSettings={siteSettings}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'keywords' && (
          <SeoKeywordsTab
            keywords={keywords}
            products={products}
            categories={categories}
            guides={guides}
            onSaveKeyword={handleSaveKeyword}
            onDeleteKeyword={handleDeleteKeyword}
            onExportKeywords={handleExportKeywords}
            onImportKeywords={handleImportKeywords}
          />
        )}

        {activeTab === 'page_seo' && (
          <SeoPageConfigTab
            pageConfigs={pageConfigs}
            onSavePageConfig={handleSavePageConfig}
          />
        )}

        {activeTab === 'sitemap' && (
          <SeoSitemapTab
            siteSettings={siteSettings}
            products={products}
            categories={categories}
            guides={guides}
            customPages={customPages}
          />
        )}

        {activeTab === 'indexing' && (
          <SeoIndexingVerificationTab
            siteSettings={siteSettings}
            onSaveSiteSettings={handleSaveSiteSettings}
          />
        )}
      </div>
    </div>
  );
}
