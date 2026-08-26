'use client';

import React from 'react';
import { SiteSettings, BrandColors } from '@/lib/types';
import { DEFAULT_BRAND_COLORS } from '@/lib/data-store';
import { Palette, Sparkles, RefreshCw } from 'lucide-react';

interface BrandColorsTabProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export default function BrandColorsTab({ settings, setSettings }: BrandColorsTabProps) {
  const brandColors = settings.brandColors || DEFAULT_BRAND_COLORS;

  const updateColor = (key: keyof BrandColors, value: string) => {
    setSettings((prev) => ({
      ...prev,
      brandColors: {
        ...(prev.brandColors || DEFAULT_BRAND_COLORS),
        [key]: value,
      },
    }));
  };

  const handleResetColors = () => {
    if (window.confirm('Reset all brand colors to factory default botanical palette?')) {
      setSettings((prev) => ({
        ...prev,
        brandColors: DEFAULT_BRAND_COLORS,
      }));
    }
  };

  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Brand Colors & Aesthetic Tokens</h3>
                <p className="text-gray-500 mt-1">
                  Customize the visual palette of Musky Dose. All colors dynamically update across buttons, cards, headings, and accents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all brand colors to default Sojat Henna palette?')) {
                    setSettings((prev) => ({ ...prev, brandColors: DEFAULT_BRAND_COLORS }));
                  }
                }}
                className="px-3.5 py-2 rounded-xl border border-[#e8e2d5] bg-white hover:bg-[#f5f1e8] text-[#0f2d22] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Reset to Musky Dose Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Color Inputs Grid */}
              <div className="lg:col-span-7 bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
                <h4 className="font-bold text-[#0f2d22] text-sm border-b border-[#e8e2d5] pb-2">Color Palette Tokens</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'primary', label: 'Primary Herbal Green', defaultVal: '#183F2B', desc: 'Main buttons, dark headers, key CTAs' },
                    { key: 'secondary', label: 'Secondary Leaf Green', defaultVal: '#5F7F52', desc: 'Subheadings, badges, success accents' },
                    { key: 'henna', label: 'Henna Terracotta', defaultVal: '#9A4F32', desc: 'Special badges, price accents, warm highlights' },
                    { key: 'gold', label: 'Muted Gold Accent', defaultVal: '#C49A55', desc: 'Borders, star ratings, CTA text highlights' },
                    { key: 'background', label: 'Natural Ivory Canvas', defaultVal: '#F7F3E8', desc: 'Overall site background color' },
                    { key: 'card', label: 'Card White Background', defaultVal: '#FFFDF8', desc: 'Product card & panel backgrounds' },
                    { key: 'text', label: 'Charcoal Body Text', defaultVal: '#22231F', desc: 'Main text color for high legibility' },
                    { key: 'muted', label: 'Muted Secondary Text', defaultVal: '#626c66', desc: 'Subtitles, disclaimers, metadata text' },
                    { key: 'border', label: 'Border Divider Color', defaultVal: '#e8e2d5', desc: 'Subtle container borders and dividers' },
                  ].map((item) => {
                    const currentColors = settings.brandColors || DEFAULT_BRAND_COLORS;
                    const currentVal = (currentColors as any)[item.key] || item.defaultVal;

                    return (
                      <div key={item.key} className="space-y-1 bg-white p-3 rounded-xl border border-[#e8e2d5]">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-[#0f2d22] text-xs">{item.label}</label>
                          <span className="font-mono text-[11px] text-gray-500 uppercase">{currentVal}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={currentVal.startsWith('#') ? currentVal : item.defaultVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings((prev) => ({
                                ...prev,
                                brandColors: { ...(prev.brandColors || DEFAULT_BRAND_COLORS), [item.key]: val },
                              }));
                            }}
                            className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white shrink-0"
                          />
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings((prev) => ({
                                ...prev,
                                brandColors: { ...(prev.brandColors || DEFAULT_BRAND_COLORS), [item.key]: val },
                              }));
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-mono uppercase text-[#0f2d22]"
                            placeholder={item.defaultVal}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Theme Preview */}
              <div className="lg:col-span-5 bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
                <h4 className="font-bold text-[#0f2d22] text-sm border-b border-[#e8e2d5] pb-2">Live Theme Preview</h4>

                <div
                  className="p-5 rounded-2xl border transition-all space-y-4 shadow-xs"
                  style={{
                    backgroundColor: (settings.brandColors || DEFAULT_BRAND_COLORS).background || '#F7F3E8',
                    borderColor: (settings.brandColors || DEFAULT_BRAND_COLORS).border || '#e8e2d5',
                    color: (settings.brandColors || DEFAULT_BRAND_COLORS).text || '#22231F',
                  }}
                >
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest block mb-0.5"
                      style={{ color: (settings.brandColors || DEFAULT_BRAND_COLORS).gold || '#C49A55' }}
                    >
                      Direct From Sojat, Rajasthan
                    </span>
                    <h3
                      className="font-serif-heading text-xl font-extrabold"
                      style={{ color: (settings.brandColors || DEFAULT_BRAND_COLORS).primary || '#183F2B' }}
                    >
                      Pure Sojat Mehendi
                    </h3>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: (settings.brandColors || DEFAULT_BRAND_COLORS).muted || '#626c66' }}
                    >
                      100% natural Lawsonia Inermis powder with high lawsone content.
                    </p>
                  </div>

                  <div
                    className="p-4 rounded-xl border space-y-3"
                    style={{
                      backgroundColor: (settings.brandColors || DEFAULT_BRAND_COLORS).card || '#FFFDF8',
                      borderColor: (settings.brandColors || DEFAULT_BRAND_COLORS).border || '#e8e2d5',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${(settings.brandColors || DEFAULT_BRAND_COLORS).henna || '#9A4F32'}15`,
                          color: (settings.brandColors || DEFAULT_BRAND_COLORS).henna || '#9A4F32',
                        }}
                      >
                        Ultra-Fine Sifted
                      </span>
                      <span
                        className="font-extrabold text-sm"
                        style={{ color: (settings.brandColors || DEFAULT_BRAND_COLORS).primary || '#183F2B' }}
                      >
                        ₹299
                      </span>
                    </div>

                    <div
                      className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center shadow-xs"
                      style={{
                        backgroundColor: (settings.brandColors || DEFAULT_BRAND_COLORS).primary || '#183F2B',
                        color: '#FFFDF8',
                        border: `1px solid ${(settings.brandColors || DEFAULT_BRAND_COLORS).gold || '#C49A55'}40`,
                      }}
                    >
                      Order on WhatsApp
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
