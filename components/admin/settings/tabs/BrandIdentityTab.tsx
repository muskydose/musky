'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { Building, Sparkles, Image, Globe, Shield, RefreshCw, Upload } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

interface BrandIdentityTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
  validationErrors: Record<string, string>;
  setMediaModalTarget: (target: 'logoUrl' | 'faviconUrl' | 'heroImageUrl' | 'factoryImageUrl' | 'ogImageUrl' | null) => void;
}

export default function BrandIdentityTab({
  settings,
  updateField,
  validationErrors,
  setMediaModalTarget,
}: BrandIdentityTabProps) {
  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Brand Identity & Visual Assets</h3>
              <p className="text-gray-500 mt-1">Configure brand name, tagline, description and logos displayed across the website.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={settings.brandName || ''}
                  onChange={(e) => {
                    updateField('brandName', e.target.value);
                    if (!settings.businessName) updateField('businessName', e.target.value);
                  }}
                  className={`w-full p-3 bg-[#fcfbf7] border rounded-xl font-bold text-[#0f2d22] ${
                    validationErrors.brandName ? 'border-red-500 bg-red-50' : 'border-[#e8e2d5]'
                  }`}
                  placeholder="e.g. Musky Dose"
                />
                {validationErrors.brandName && <p className="text-red-500 text-[10px] mt-1 font-semibold">{validationErrors.brandName}</p>}
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Registered Business Name</label>
                <input
                  type="text"
                  value={settings.businessName || ''}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="e.g. Musky Dose Enterprise"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="e.g. Rooted in Nature. Made for You."
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Official Website URL</label>
                <input
                  type="url"
                  value={settings.websiteUrl || ''}
                  onChange={(e) => updateField('websiteUrl', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="https://muskydose.in"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">Short Brand Overview</label>
                <textarea
                  rows={2}
                  value={settings.shortDescription || ''}
                  onChange={(e) => updateField('shortDescription', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Brief 1-2 sentence description for header & site overviews..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">Footer Brand Bio / Description</label>
                <textarea
                  rows={2}
                  value={settings.footerDescription || ''}
                  onChange={(e) => updateField('footerDescription', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Authentic 100% pure, unadulterated Lawsonia Inermis Henna & natural botanical products cultivated in Sojat, Rajasthan..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">Footer Copyright Notice</label>
                <input
                  type="text"
                  value={settings.copyrightText || ''}
                  onChange={(e) => updateField('copyrightText', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="© 2026 Musky Dose. All Rights Reserved. Crafted with care in Sojat, Rajasthan, India."
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Support Email Address</label>
                <input
                  type="email"
                  value={settings.businessEmail || ''}
                  onChange={(e) => updateField('businessEmail', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="info@muskydose.in"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Display Phone Number (Public Text)</label>
                <input
                  type="text"
                  value={settings.displayPhone || ''}
                  onChange={(e) => updateField('displayPhone', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="+91 82337 03080"
                />
              </div>

              {/* Logo Upload / URL */}
              <div className="space-y-3 bg-[#f8f6f0] p-4 rounded-2xl border border-[#e8e2d5]">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0f2d22] text-base">Brand Logo Image</label>
                    <span className="text-xs bg-[#e2ece9] text-[#1b4332] px-2.5 py-1 rounded-full font-semibold">PNG / Image Asset</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Primary brand logo displayed on Navbar, Mobile Menu, Footer, and Schema metadata. Transparent PNG recommended.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    className="flex-1 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-sm"
                    placeholder="https://... or upload PNG file"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaModalTarget('logoUrl')}
                    className="bg-[#1b4332] text-white px-3.5 py-3 rounded-xl font-bold flex items-center gap-1.5 shrink-0 hover:bg-[#0f2d22] text-sm"
                  >
                    <span>Media Library</span>
                  </button>
                  <label className={`bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-3.5 py-3 rounded-xl cursor-pointer font-semibold flex items-center gap-1.5 shrink-0 text-sm ${false ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4" />
                    <span>{false ? 'Uploading...' : 'Upload PNG'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setMediaModalTarget('logoUrl')} className="hidden" disabled={false} />
                  </label>
                  {settings.logoUrl && (
                    <button
                      type="button"
                      onClick={() => updateField('logoUrl', '')}
                      className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-3 rounded-xl font-semibold text-xs shrink-0"
                      title="Restore default project logo"
                    >
                      Restore Default
                    </button>
                  )}
                </div>

                {/* Logo Preview & Info */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="relative w-24 h-14 rounded-xl border border-[#d8d2c5] p-2 bg-[#ffffff] flex items-center justify-center overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.logoUrl || '/logo.png'}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p className="font-semibold text-[#0f2d22]">
                      Status: {settings.logoUrl ? 'Custom Cloud Asset Active' : 'Default Project Asset (/logo.png)'}
                    </p>
                    <p className="text-gray-500">
                      URL: {settings.logoUrl || '/logo.png'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Favicon Upload / URL */}
              <div className="space-y-3 bg-[#f8f6f0] p-4 rounded-2xl border border-[#e8e2d5]">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0f2d22] text-base">Favicon & App Icon Image</label>
                    <span className="text-xs bg-[#e2ece9] text-[#1b4332] px-2.5 py-1 rounded-full font-semibold">32x32 to 512x512 PNG</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Browser tab icon, bookmark badge, Apple Touch Icon, and PWA shortcut icon. High-resolution PNG supported.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <input
                    type="text"
                    value={settings.faviconUrl || ''}
                    onChange={(e) => updateField('faviconUrl', e.target.value)}
                    className="flex-1 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-sm"
                    placeholder="https://... or upload PNG file"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaModalTarget('faviconUrl')}
                    className="bg-[#1b4332] text-white px-3.5 py-3 rounded-xl font-bold flex items-center gap-1.5 shrink-0 hover:bg-[#0f2d22] text-sm"
                  >
                    <span>Media Library</span>
                  </button>
                  <label className={`bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-3.5 py-3 rounded-xl cursor-pointer font-semibold flex items-center gap-1.5 shrink-0 text-sm ${false ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4" />
                    <span>{false ? 'Uploading...' : 'Upload PNG'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setMediaModalTarget('logoUrl')} className="hidden" disabled={false} />
                  </label>
                  {settings.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => updateField('faviconUrl', '')}
                      className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-3 rounded-xl font-semibold text-xs shrink-0"
                      title="Restore default project favicon"
                    >
                      Restore Default
                    </button>
                  )}
                </div>

                {/* Favicon Preview & Info */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="relative w-12 h-12 rounded-xl border border-[#d8d2c5] p-2 bg-[#ffffff] flex items-center justify-center overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.faviconUrl || '/favicon.png'}
                      alt="Favicon Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-gray-600 space-[#0f2d22]">
                    <p className="font-semibold text-[#0f2d22]">
                      Status: {settings.faviconUrl ? 'Custom Cloud Asset Active' : 'Default Project Asset (/favicon.png)'}
                    </p>
                    <p className="text-gray-500">
                      URL: {settings.faviconUrl || '/favicon.png'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
