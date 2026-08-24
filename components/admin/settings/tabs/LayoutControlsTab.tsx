'use client';

import React from 'react';
import { SiteSettings, LayoutControls } from '@/lib/types';
import { DEFAULT_LAYOUT_CONTROLS } from '@/lib/data-store';
import { Layout, Sliders, Smartphone, Monitor, Eye, RefreshCw, Building, ShoppingCart, Type } from 'lucide-react';

interface LayoutControlsTabProps {
  settings: SiteSettings;
  updateLayoutControl: (field: keyof LayoutControls, value: any) => void;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export default function LayoutControlsTab({
  settings,
  updateLayoutControl,
  setSettings,
}: LayoutControlsTabProps) {
  const layoutControls = settings.layoutControls || DEFAULT_LAYOUT_CONTROLS;

  const handleResetLayout = () => {
    if (window.confirm('Reset all layout and display controls to default compact values?')) {
      setSettings((prev) => ({
        ...prev,
        layoutControls: DEFAULT_LAYOUT_CONTROLS,
      }));
    }
  };

  return (
    <div className="space-y-6">
          <div className="space-y-8">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Layout & Display Controls</h3>
              <p className="text-gray-500 mt-1">Configure site-wide sizing, header dimensions, hero heights, product card aspect ratios, grid columns, and typography scale.</p>
            </div>

            {/* Section 1: Brand & Header Sizing */}
            <div className="p-5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-2xl space-y-4">
              <h4 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#c5a059]" />
                <span>1. Brand & Header Sizing</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Mobile Logo Width (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={260}
                    value={settings.layoutControls?.mobileLogoWidth ?? 140}
                    onChange={(e) => updateLayoutControl('mobileLogoWidth', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Width of logo on mobile viewports (e.g. 140px)</p>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Desktop Logo Width (px)</label>
                  <input
                    type="number"
                    min={100}
                    max={360}
                    value={settings.layoutControls?.desktopLogoWidth ?? 180}
                    onChange={(e) => updateLayoutControl('desktopLogoWidth', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Width of logo on tablet & desktop (e.g. 180px)</p>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Header Vertical Padding (px)</label>
                  <input
                    type="number"
                    min={4}
                    max={32}
                    value={settings.layoutControls?.headerPaddingVertical ?? 12}
                    onChange={(e) => updateLayoutControl('headerPaddingVertical', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Header Style</label>
                  <select
                    value={settings.layoutControls?.headerStyle ?? 'normal'}
                    onChange={(e) => updateLayoutControl('headerStyle', e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value="normal">Normal (Balanced padding)</option>
                    <option value="compact">Compact (Ultra slim header)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Hero & Banner Sizing */}
            <div className="p-5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-2xl space-y-4">
              <h4 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <Layout className="w-4 h-4 text-[#c5a059]" />
                <span>2. Hero & Banner Sizing</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Mobile Hero Height (px)</label>
                  <input
                    type="number"
                    min={250}
                    max={650}
                    value={settings.layoutControls?.mobileHeroHeight ?? 420}
                    onChange={(e) => updateLayoutControl('mobileHeroHeight', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Desktop Hero Height (px)</label>
                  <input
                    type="number"
                    min={350}
                    max={850}
                    value={settings.layoutControls?.desktopHeroHeight ?? 560}
                    onChange={(e) => updateLayoutControl('desktopHeroHeight', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Hero Heading Mobile Font Size (px)</label>
                  <input
                    type="number"
                    min={18}
                    max={44}
                    value={settings.layoutControls?.heroHeadingMobileSize ?? 28}
                    onChange={(e) => updateLayoutControl('heroHeadingMobileSize', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Hero Heading Desktop Font Size (px)</label>
                  <input
                    type="number"
                    min={32}
                    max={80}
                    value={settings.layoutControls?.heroHeadingDesktopSize ?? 48}
                    onChange={(e) => updateLayoutControl('heroHeadingDesktopSize', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Product Card & Grid Sizing */}
            <div className="p-5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-2xl space-y-4">
              <h4 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#c5a059]" />
                <span>3. Product Card & Grid Sizing</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Mobile Grid Columns</label>
                  <select
                    value={settings.layoutControls?.mobileGridColumns ?? 2}
                    onChange={(e) => updateLayoutControl('mobileGridColumns', Number(e.target.value) as any)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value={1}>1 Column (Full width cards)</option>
                    <option value={2}>2 Columns (Standard mobile marketplace grid)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Desktop Grid Columns</label>
                  <select
                    value={settings.layoutControls?.desktopGridColumns ?? 4}
                    onChange={(e) => updateLayoutControl('desktopGridColumns', Number(e.target.value) as any)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value={3}>3 Columns (Large cards)</option>
                    <option value={4}>4 Columns (Standard marketplace layout)</option>
                    <option value={5}>5 Columns (Dense high-capacity layout)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Product Image Aspect Ratio</label>
                  <select
                    value={settings.layoutControls?.productCardAspectRatio ?? 'portrait'}
                    onChange={(e) => updateLayoutControl('productCardAspectRatio', e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value="square">1:1 Square</option>
                    <option value="portrait">3:4 Tall Portrait (Recommended for Henna Packs)</option>
                    <option value="landscape">4:3 Landscape Wide</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Product Card Inner Padding</label>
                  <select
                    value={settings.layoutControls?.productCardPadding ?? 'standard'}
                    onChange={(e) => updateLayoutControl('productCardPadding', e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value="compact">Compact (Dense)</option>
                    <option value="standard">Standard (Balanced)</option>
                    <option value="spaced">Spaced (Generous spacing)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Typography & Spacing Scale */}
            <div className="p-5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-2xl space-y-4">
              <h4 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <Type className="w-4 h-4 text-[#c5a059]" />
                <span>4. Typography & Spacing Scale</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Heading Scale Factor</label>
                  <select
                    value={settings.layoutControls?.headingScaleFactor ?? 1.0}
                    onChange={(e) => updateLayoutControl('headingScaleFactor', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value={0.9}>0.9x (Subtle / Smaller Headings)</option>
                    <option value={1.0}>1.0x (Standard Balanced Ratio)</option>
                    <option value={1.1}>1.1x (Prominent High-Contrast Headings)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Base Body Font Size (px)</label>
                  <select
                    value={settings.layoutControls?.bodyFontSizeBase ?? 16}
                    onChange={(e) => updateLayoutControl('bodyFontSizeBase', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value={14}>14px (Dense)</option>
                    <option value={15}>15px (Medium)</option>
                    <option value={16}>16px (Standard Accessible Base)</option>
                    <option value={18}>18px (Large Readability)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Container Max Width (px)</label>
                  <select
                    value={settings.layoutControls?.containerMaxWidth ?? 1280}
                    onChange={(e) => updateLayoutControl('containerMaxWidth', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value={1200}>1200px (Compact)</option>
                    <option value={1280}>1280px (Standard Max-W-7XL)</option>
                    <option value={1440}>1440px (Wide Desktop)</option>
                    <option value={1600}>1600px (Ultra Wide)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Section Vertical Padding</label>
                  <select
                    value={settings.layoutControls?.sectionVerticalPadding ?? 'standard'}
                    onChange={(e) => updateLayoutControl('sectionVerticalPadding', e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value="compact">Compact Padding</option>
                    <option value="standard">Standard Balanced Padding</option>
                    <option value="generous">Generous Spaced Padding</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#0f2d22] mb-1">Mobile Screen Margin (px)</label>
                  <select
                    value={settings.layoutControls?.mobileScreenMargin ?? 16}
                    onChange={(e) => updateLayoutControl('mobileScreenMargin', Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22]"
                  >
                    <option value={12}>12px (Compact)</option>
                    <option value={16}>16px (Standard Mobile Gutter)</option>
                    <option value={20}>20px (Spaced Mobile Padding)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
