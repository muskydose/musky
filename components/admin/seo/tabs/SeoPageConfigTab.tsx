'use client';

import React, { useState } from 'react';
import { PageSeoConfig } from '@/lib/types';
import {
  FileText,
  Search,
  ExternalLink,
  Edit,
  CheckCircle,
  AlertCircle,
  Save,
  Globe,
  Image,
  RefreshCw,
} from 'lucide-react';

interface SeoPageConfigTabProps {
  pageConfigs: PageSeoConfig[];
  onSavePageConfig: (config: PageSeoConfig) => Promise<void>;
}

export default function SeoPageConfigTab({
  pageConfigs,
  onSavePageConfig,
}: SeoPageConfigTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>(pageConfigs[0]?.id || 'home');
  const [editingConfig, setEditingConfig] = useState<PageSeoConfig | null>(pageConfigs[0] || null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const found = pageConfigs.find((p) => p.id === id);
    if (found) {
      setEditingConfig({ ...found });
      setSavedSuccess(false);
      setErrorMessage('');
    }
  };

  const handleSave = async () => {
    if (!editingConfig) return;
    setSaving(true);
    setErrorMessage('');
    setSavedSuccess(false);
    try {
      await onSavePageConfig(editingConfig);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save page SEO configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Page List Sidebar */}
        <div className="bg-white border border-[#e8e2d5] p-4 rounded-2xl space-y-3 h-fit">
          <h3 className="text-xs font-bold uppercase text-[#626c66] tracking-wider">Select Page to Configure</h3>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {pageConfigs.map((p) => {
              const isSelected = p.id === selectedPageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPage(p.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-[#183F2B] text-white font-bold' : 'hover:bg-[#FAF8F5] text-[#0f2d22]'
                  }`}
                >
                  <span className="truncate">{p.seoTitle || p.targetUrl}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.targetType}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Page Meta Editor */}
        <div className="md:col-span-2 space-y-4">
          {editingConfig ? (
            <div className="bg-white border border-[#e8e2d5] p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#0f2d22]">
                    Page SEO: <span className="font-mono text-sm text-[#183F2B]">{editingConfig.targetUrl}</span>
                  </h3>
                  <p className="text-xs text-[#626c66]">Configure Google search snippet and social meta preview.</p>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183F2B] text-white text-xs font-bold rounded-xl hover:bg-[#123021] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>{saving ? 'Saving...' : 'Save Meta'}</span>
                </button>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Page SEO configuration saved successfully.</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SERP Preview Box */}
              <div className="p-4 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl space-y-1">
                <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                  <Globe className="w-3 h-3 text-gray-400" />
                  <span>https://muskydose.in{editingConfig.targetUrl}</span>
                </div>
                <div className="text-sm font-semibold text-[#1a0dab] line-clamp-1 hover:underline cursor-pointer">
                  {editingConfig.seoTitle || 'Musky Dose — Pure Sojat Henna & Natural Herbal Products'}
                </div>
                <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                  {editingConfig.metaDescription || 'Ultra-fine sifted authentic Lawsonia Inermis henna powder and natural botanical hair care direct from Sojat, Rajasthan.'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#626c66]">SEO Meta Title</label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {(editingConfig.seoTitle || '').length} / 60 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editingConfig.seoTitle || ''}
                    onChange={(e) => setEditingConfig((prev) => prev ? { ...prev, seoTitle: e.target.value } : null)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="Page Meta Title for Google SERP"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#626c66]">Meta Description</label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {(editingConfig.metaDescription || '').length} / 160 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={editingConfig.metaDescription || ''}
                    onChange={(e) => setEditingConfig((prev) => prev ? { ...prev, metaDescription: e.target.value } : null)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] leading-relaxed"
                    placeholder="150-160 character description optimized for Google search clicks"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#626c66] mb-1">Primary Target Keyword</label>
                    <input
                      type="text"
                      value={editingConfig.primaryKeyword || ''}
                      onChange={(e) => setEditingConfig((prev) => prev ? { ...prev, primaryKeyword: e.target.value } : null)}
                      className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                      placeholder="e.g. sojat henna powder"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#626c66] mb-1">Robots Indexing</label>
                    <select
                      value={editingConfig.robotsIndex || 'index'}
                      onChange={(e) => setEditingConfig((prev) => prev ? { ...prev, robotsIndex: e.target.value as any } : null)}
                      className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    >
                      <option value="index">Index (Recommended)</option>
                      <option value="noindex">Noindex (Hide from search engines)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#626c66] mb-1">OpenGraph Social Share Image URL</label>
                  <input
                    type="text"
                    value={editingConfig.ogImage || ''}
                    onChange={(e) => setEditingConfig((prev) => prev ? { ...prev, ogImage: e.target.value } : null)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="https://.../og-image.jpg"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#626c66] bg-white border border-[#e8e2d5] rounded-2xl">
              Select a page to edit its SEO configuration.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
