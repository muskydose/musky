'use client';

import React from 'react';
import { SiteSettings, Product, Category, ProductGuide, CustomPage } from '@/lib/types';
import {
  FileCode,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Globe,
  Share2,
  ShieldCheck,
} from 'lucide-react';

interface SeoSitemapTabProps {
  siteSettings: SiteSettings;
  products: Product[];
  categories: Category[];
  guides: ProductGuide[];
  customPages: CustomPage[];
}

export default function SeoSitemapTab({
  siteSettings,
  products,
  categories,
  guides,
  customPages,
}: SeoSitemapTabProps) {
  const baseUrl = siteSettings.websiteUrl || 'https://muskydose.in';
  const totalUrls = 10 + products.length + categories.length + guides.length + customPages.length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e8e2d5] p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#e8f3ed] text-[#183F2B] rounded-xl">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f2d22]">Dynamic XML Sitemap & Robots.txt</h2>
              <p className="text-xs text-[#626c66]">
                Real-time generated sitemap automatically synced with published catalog items and guides.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#183F2B] text-white rounded-xl hover:bg-[#123021] transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Live /sitemap.xml</span>
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View /robots.txt</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl">
            <div className="text-xs text-[#626c66]">Total Sitemap URLs</div>
            <div className="text-xl font-bold text-[#0f2d22] mt-0.5">{totalUrls}</div>
          </div>
          <div className="p-3.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl">
            <div className="text-xs text-[#626c66]">Products Indexed</div>
            <div className="text-xl font-bold text-[#183F2B] mt-0.5">{products.length}</div>
          </div>
          <div className="p-3.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl">
            <div className="text-xs text-[#626c66]">Categories Indexed</div>
            <div className="text-xl font-bold text-[#183F2B] mt-0.5">{categories.length}</div>
          </div>
          <div className="p-3.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl">
            <div className="text-xs text-[#626c66]">Guides Indexed</div>
            <div className="text-xl font-bold text-[#183F2B] mt-0.5">{guides.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
