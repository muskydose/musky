'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { Search, Globe, Image, CheckCircle, AlertCircle, Upload } from 'lucide-react';

interface SeoMetaTabProps {
  validationErrors?: Record<string, string>;
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
  setMediaModalTarget: (target: 'logoUrl' | 'faviconUrl' | 'heroImageUrl' | 'factoryImageUrl' | 'ogImageUrl' | null) => void;
}

export default function SeoMetaTab({ settings, updateField, setMediaModalTarget, validationErrors = {} }: SeoMetaTabProps) {
  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">SEO & Open Graph Meta Tags</h3>
              <p className="text-gray-500 mt-1">Optimize how Musky Dose appears on Google search results and WhatsApp link shares.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">SEO Title Tag *</label>
                <input
                  type="text"
                  required
                  value={settings.seoTitle || ''}
                  onChange={(e) => updateField('seoTitle', e.target.value)}
                  className={`w-full p-3 bg-[#fcfbf7] border rounded-xl font-bold text-[#0f2d22] ${
                    validationErrors.seoTitle ? 'border-red-500 bg-red-50' : 'border-[#e8e2d5]'
                  }`}
                  placeholder="Musky Dose — Premium Henna & Herbal Products from Sojat, Rajasthan"
                />
                {validationErrors.seoTitle && <p className="text-red-500 text-[10px] mt-1 font-semibold">{validationErrors.seoTitle}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">SEO Meta Description</label>
                <textarea
                  rows={3}
                  value={settings.seoDescription || ''}
                  onChange={(e) => updateField('seoDescription', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Order Pure Natural Sojat Mehendi Powder, Natural Indigo, Herbal Hair Packs..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">SEO Keywords (Comma Separated)</label>
                <input
                  type="text"
                  value={settings.seoKeywords || ''}
                  onChange={(e) => updateField('seoKeywords', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Sojat Henna, Pure Mehendi, Rajasthani Henna, Natural Indigo, Musky Dose"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Open Graph Title (Social Shares)</label>
                <input
                  type="text"
                  value={settings.ogTitle || settings.seoTitle || ''}
                  onChange={(e) => updateField('ogTitle', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Musky Dose — Premium Sojat Henna"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Canonical Base URL</label>
                <input
                  type="text"
                  value={settings.canonicalUrl || ''}
                  onChange={(e) => updateField('canonicalUrl', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="https://muskydose.in"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block font-bold text-[#0f2d22]">Open Graph Share Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.ogImageUrl || ''}
                    onChange={(e) => updateField('ogImageUrl', e.target.value)}
                    className="flex-1 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                    placeholder="https://..."
                  />
                  <label className="bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-4 py-3 rounded-xl cursor-pointer font-semibold flex items-center gap-1.5 shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={(e) => setMediaModalTarget('ogImageUrl')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
