'use client';

import React, { useState } from 'react';
import { SiteSettings, WhyCard, TestimonialItem, HeroSlide, TrustStripItem, HomepageSectionConfig } from '@/lib/types';
import { DEFAULT_WHY_CARDS, DEFAULT_TESTIMONIALS, DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_TRUST_STRIP_ITEMS } from '@/lib/data-store';
import {
  Layout,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Image,
  RefreshCw,
  Star,
  Quote,
  Copy,
  Upload,
} from 'lucide-react';

interface HomepageBuilderTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  setMediaModalTarget: (target: 'logoUrl' | 'faviconUrl' | 'heroImageUrl' | 'factoryImageUrl' | 'ogImageUrl' | null) => void;
}

export default function HomepageBuilderTab({
  settings,
  updateField,
  setSettings,
  setMediaModalTarget,
}: HomepageBuilderTabProps) {
  const whyCards = settings.whyCards && settings.whyCards.length > 0 ? settings.whyCards : DEFAULT_WHY_CARDS;
  const testimonials = settings.testimonials && settings.testimonials.length > 0 ? settings.testimonials : DEFAULT_TESTIMONIALS;
  const heroSlides = settings.homepageHero && settings.homepageHero.length > 0 ? settings.homepageHero : [];
  const trustStripItems = settings.trustStripItems && settings.trustStripItems.length > 0 ? settings.trustStripItems : DEFAULT_TRUST_STRIP_ITEMS;
  

  const handleAddWhyCard = () => {
    const newCard: WhyCard = {
      id: `why-${Date.now()}`,
      title: 'New Value Proposition',
      description: 'Highlight a core strength of Musky Dose products and Sojat manufacturing.',
      icon: 'ShieldCheck',
      enabled: true,
      sortOrder: whyCards.length + 1,
    };
    setSettings((prev) => ({ ...prev, whyCards: [...(prev.whyCards || DEFAULT_WHY_CARDS), newCard] }));
  };

  const handleUpdateWhyCard = (id: string, field: keyof WhyCard, value: any) => {
    const updated = whyCards.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setSettings((prev) => ({ ...prev, whyCards: updated }));
  };

  const handleDeleteWhyCard = (id: string) => {
    const updated = whyCards.filter((c) => c.id !== id);
    setSettings((prev) => ({ ...prev, whyCards: updated }));
  };

  const handleMoveWhyCard = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= whyCards.length) return;
    const updated = [...whyCards];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSettings((prev) => ({ ...prev, whyCards: updated }));
  };

  const handleAddTestimonial = () => {
    const newTestimonial: TestimonialItem = {
      id: `test-${Date.now()}`,
      customerName: 'Customer Name',
      location: 'Verified Buyer',
      reviewText: 'Authentic feedback praising pure Sojat henna quality, fast delivery, and results.',
      rating: 5,
      enabled: true,
      sortOrder: testimonials.length + 1,
    };
    setSettings((prev) => ({ ...prev, testimonials: [...(prev.testimonials || DEFAULT_TESTIMONIALS), newTestimonial] }));
  };

  const handleUpdateTestimonial = (id: string, field: keyof TestimonialItem, value: any) => {
    const updated = testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setSettings((prev) => ({ ...prev, testimonials: updated }));
  };

  const handleDeleteTestimonial = (id: string) => {
    const updated = testimonials.filter((t) => t.id !== id);
    setSettings((prev) => ({ ...prev, testimonials: updated }));
  };

  const handleMoveTestimonial = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= testimonials.length) return;
    const updated = [...testimonials];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSettings((prev) => ({ ...prev, testimonials: updated }));
  };

  return (
    <div className="space-y-6">
          <div className="space-y-8">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Homepage Content & Section Manager</h3>
              <p className="text-gray-500 mt-1">Manage hero text, images, announcement bar, brand promise, factory story, and callout sections.</p>
            </div>

            {/* Homepage Category Display Count Setting */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-3">
              <h4 className="font-bold text-[#0f2d22] text-sm flex items-center gap-2 border-b border-[#e8e2d5] pb-2">
                <Layout className="w-4 h-4 text-[#c5a059]" />
                <span>Homepage Category Grid Settings</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                    Homepage Category Display Limit
                  </label>
                  <select
                    value={settings.homepageCategoryCount ?? 6}
                    onChange={(e) => updateField('homepageCategoryCount', parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-bold text-[#0f2d22]"
                  >
                    <option value={4}>Show 4 Categories</option>
                    <option value={6}>Show 6 Categories (Recommended Default)</option>
                    <option value={8}>Show 8 Categories</option>
                    <option value={12}>Show 12 Categories</option>
                    <option value={999}>Show All Active Categories</option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Controls how many category cards appear on the homepage before the &quot;View All Categories &rarr;&quot; CTA.
                  </p>
                </div>
              </div>
            </div>

            {/* Section Order & Visibility Manager */}
            <div className="bg-[#fcfbf7] p-5 sm:p-6 rounded-2xl border border-[#e8e2d5] space-y-5">
              <div className="border-b border-[#e8e2d5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-[#0f2d22] text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#c5a059]" />
                    <span>Homepage Section Order, Visibility & Content</span>
                  </h4>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Reorder sections, toggle visibility, edit headings, image banners, CTA links, item display limits, duplicate, or remove sections.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const current = settings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS;
                      const missing = DEFAULT_HOMEPAGE_SECTIONS.filter((d) => !current.some((c) => c.id === d.id));
                      if (missing.length === 0) {
                        alert('All default sections are already present.');
                        return;
                      }
                      const updated = [...current, ...missing].map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
                      updateField('homepageSections', updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#e8e2d5] bg-white text-[#1b4332] font-bold text-xs hover:bg-[#f5f1e8]"
                  >
                    + Restore Missing Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('homepageSections', DEFAULT_HOMEPAGE_SECTIONS)}
                    className="text-xs text-red-700 hover:text-red-900 font-semibold underline"
                  >
                    Reset All to Default
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const currentSections: HomepageSectionConfig[] =
                    settings.homepageSections && settings.homepageSections.length > 0
                      ? [...settings.homepageSections].sort((a, b) => a.sortOrder - b.sortOrder)
                      : DEFAULT_HOMEPAGE_SECTIONS;

                  const handleToggle = (secId: string) => {
                    const updated = currentSections.map((s) =>
                      s.id === secId ? { ...s, enabled: !s.enabled } : s
                    );
                    updateField('homepageSections', updated);
                  };

                  const handleMove = (index: number, direction: 'up' | 'down') => {
                    const targetIndex = direction === 'up' ? index - 1 : index + 1;
                    if (targetIndex < 0 || targetIndex >= currentSections.length) return;

                    const list = [...currentSections];
                    const [moved] = list.splice(index, 1);
                    list.splice(targetIndex, 0, moved);

                    const reordered = list.map((item, idx) => ({
                      ...item,
                      sortOrder: idx + 1,
                    }));

                    updateField('homepageSections', reordered);
                  };

                  const handleDetailChange = (
                    secId: string,
                    field: keyof HomepageSectionConfig,
                    val: any
                  ) => {
                    const updated = currentSections.map((s) =>
                      s.id === secId ? { ...s, [field]: val } : s
                    );
                    updateField('homepageSections', updated);
                  };

                  const handleDuplicateSection = (secId: string) => {
                    const target = currentSections.find((s) => s.id === secId);
                    if (!target) return;
                    const newSec: HomepageSectionConfig = {
                      ...target,
                      id: `${target.id}_copy_${Date.now().toString().slice(-4)}`,
                      name: `${target.name} (Copy)`,
                      sortOrder: target.sortOrder + 1,
                    };
                    const list = [...currentSections];
                    const targetIdx = list.findIndex((s) => s.id === secId);
                    list.splice(targetIdx + 1, 0, newSec);
                    const reordered = list.map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
                    updateField('homepageSections', reordered);
                  };

                  const handleDeleteSection = (secId: string) => {
                    if (currentSections.length <= 1) {
                      alert('At least one homepage section must remain.');
                      return;
                    }
                    if (window.confirm('Remove this section from the homepage? You can restore it anytime via "Restore Missing Defaults".')) {
                      const updated = currentSections
                        .filter((s) => s.id !== secId)
                        .map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
                      updateField('homepageSections', updated);
                    }
                  };

                  return (
                    <div className="space-y-3">
                      {currentSections.map((sec, idx) => (
                        <div
                          key={sec.id}
                          className={`p-4 rounded-xl border transition-all ${
                            sec.enabled
                              ? 'bg-white border-[#e8e2d5] shadow-2xs'
                              : 'bg-gray-100/70 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-[#f5f1e8] text-[#0f2d22] font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-[#0f2d22] text-sm">{sec.name}</h5>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      sec.enabled
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {sec.enabled ? 'VISIBLE' : 'HIDDEN'}
                                  </span>
                                </div>
                                <p className="text-[#c5a059] font-medium text-[11px] truncate mt-0.5">
                                  ID: {sec.id}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Enable / Disable Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggle(sec.id)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                                  sec.enabled
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                                }`}
                              >
                                {sec.enabled ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>ON</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>OFF</span>
                                  </>
                                )}
                              </button>

                              {/* Duplicate Button */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateSection(sec.id)}
                                className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] hover:bg-[#f5f1e8] text-[#0f2d22]"
                                title="Duplicate Section"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              {/* Up Button */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMove(idx, 'up')}
                                className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] hover:bg-[#f5f1e8] disabled:opacity-30 disabled:cursor-not-allowed text-[#0f2d22]"
                                title="Move Up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>

                              {/* Down Button */}
                              <button
                                type="button"
                                disabled={idx === currentSections.length - 1}
                                onClick={() => handleMove(idx, 'down')}
                                className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] hover:bg-[#f5f1e8] disabled:opacity-30 disabled:cursor-not-allowed text-[#0f2d22]"
                                title="Move Down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(sec.id)}
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                title="Remove Section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expandable Editable Fields */}
                          {sec.enabled && (
                            <div className="mt-3 pt-3 border-t border-[#f0eae0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">Section Heading</label>
                                <input
                                  type="text"
                                  value={sec.heading || ''}
                                  onChange={(e) => handleDetailChange(sec.id, 'heading', e.target.value)}
                                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                  placeholder={sec.name}
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">Subheading / Eyebrow</label>
                                <input
                                  type="text"
                                  value={sec.subheading || ''}
                                  onChange={(e) => handleDetailChange(sec.id, 'subheading', e.target.value)}
                                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                  placeholder="Subheading..."
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">Section Description</label>
                                <input
                                  type="text"
                                  value={sec.description || ''}
                                  onChange={(e) => handleDetailChange(sec.id, 'description', e.target.value)}
                                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                  placeholder="Supporting description text..."
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">CTA Button Text</label>
                                <input
                                  type="text"
                                  value={sec.ctaText || ''}
                                  onChange={(e) => handleDetailChange(sec.id, 'ctaText', e.target.value)}
                                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                  placeholder="e.g. VIEW ALL PRODUCTS"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">CTA Target Link</label>
                                <input
                                  type="text"
                                  value={sec.ctaLink || ''}
                                  onChange={(e) => handleDetailChange(sec.id, 'ctaLink', e.target.value)}
                                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                  placeholder="e.g. /products"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">Item Limit (Max Displayed)</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={24}
                                  value={sec.itemLimit || 8}
                                  onChange={(e) => handleDetailChange(sec.id, 'itemLimit', parseInt(e.target.value) || 8)}
                                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block font-bold text-[#0f2d22] mb-0.5 text-[11px]">Section Background / Feature Image URL</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={sec.imageUrl || ''}
                                    onChange={(e) => handleDetailChange(sec.id, 'imageUrl', e.target.value)}
                                    className="flex-1 p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[#0f2d22]"
                                    placeholder="https://... image banner URL"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Announcement Bar Settings */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
                <span className="font-bold text-[#0f2d22] text-sm">Top Announcement Bar</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.announcementEnabled ?? true}
                    onChange={(e) => updateField('announcementEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b4332]"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Announcement Text</label>
                  <input
                    type="text"
                    value={settings.announcementText || ''}
                    onChange={(e) => updateField('announcementText', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="Pure Natural & Ultra-Fine Sifted Henna Direct from Sojat, Rajasthan"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Announcement Link URL</label>
                  <input
                    type="text"
                    value={settings.announcementLink || ''}
                    onChange={(e) => updateField('announcementLink', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="/products"
                  />
                </div>
              </div>
            </div>

            {/* Hero Section Builder */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <h4 className="font-bold text-[#0f2d22] text-sm border-b border-[#e8e2d5] pb-2">
                Hero Banner Section
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Eyebrow Badge Tag</label>
                  <input
                    type="text"
                    value={settings.heroEyebrow || ''}
                    onChange={(e) => updateField('heroEyebrow', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-semibold text-[#c5a059]"
                    placeholder="Direct from Sojat, Rajasthan, India"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Main Headline *</label>
                  <input
                    type="text"
                    value={settings.heroTitle || ''}
                    onChange={(e) => updateField('heroTitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="Authentic 100% Pure Sojat Henna & Natural Herbal Care"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Sub-headline Description</label>
                  <textarea
                    rows={2}
                    value={settings.heroSubtitle || ''}
                    onChange={(e) => updateField('heroSubtitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Ultra-fine sifted natural mehendi, natural indigo..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Primary CTA Button Label</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryCtaText || ''}
                    onChange={(e) => updateField('heroPrimaryCtaText', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="ORDER ON WHATSAPP"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Primary CTA Link</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryCtaLink || ''}
                    onChange={(e) => updateField('heroPrimaryCtaLink', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="https://wa.me/918233703080 or /products"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Secondary CTA Button Label</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryCtaText || ''}
                    onChange={(e) => updateField('heroSecondaryCtaText', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="EXPLORE PRODUCTS"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Secondary CTA Link</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryCtaLink || ''}
                    onChange={(e) => updateField('heroSecondaryCtaLink', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="/products"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block font-bold text-[#0f2d22]">Hero Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.heroImageUrl || ''}
                      onChange={(e) => updateField('heroImageUrl', e.target.value)}
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                      placeholder="https://..."
                    />
                    <label className="bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-3 py-2.5 rounded-xl cursor-pointer font-semibold flex items-center gap-1.5 shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => setMediaModalTarget('heroImageUrl')} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Promise Section */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
                <span className="font-bold text-[#0f2d22] text-sm">Why Musky Dose / Brand Promise Section</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.whyMuskyDoseEnabled ?? true}
                    onChange={(e) => updateField('whyMuskyDoseEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b4332]"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Section Title</label>
                  <input
                    type="text"
                    value={settings.whyMuskyDoseTitle || ''}
                    onChange={(e) => updateField('whyMuskyDoseTitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold"
                    placeholder="Pure Lawsonia Inermis Sourced From Sojat"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Section Description</label>
                  <textarea
                    rows={3}
                    value={settings.whyMuskyDoseDescription || ''}
                    onChange={(e) => updateField('whyMuskyDoseDescription', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="Sojat in Pali district, Rajasthan is globally celebrated..."
                  />
                </div>

                {/* Why Cards Builder */}
                <div className="pt-4 border-t border-[#e8e2d5] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-[#0f2d22] text-xs uppercase tracking-wider">Value Cards ({whyCards.length})</h5>
                      <p className="text-[11px] text-[#626c66]">Manage key feature cards shown under &quot;Why Musky Dose&quot;.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWhyCard}
                      className="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#0f2d22]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#c5a059]" /> Add Feature Card
                    </button>
                  </div>

                  <div className="space-y-3">
                    {whyCards.map((card, idx) => (
                      <div key={card.id} className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FAF8F5] border border-[#e8e2d5] text-[10px] font-bold text-[#1b4332] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-[#0f2d22]">{card.title || 'Untitled Card'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateWhyCard(card.id, 'enabled', !card.enabled)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                card.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {card.enabled ? 'VISIBLE' : 'HIDDEN'}
                            </button>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveWhyCard(idx, 'up')}
                              className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === whyCards.length - 1}
                              onClick={() => handleMoveWhyCard(idx, 'down')}
                              className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWhyCard(card.id)}
                              className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                              title="Delete Card"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block font-semibold text-[#0f2d22] text-[10px]">Title</label>
                            <input
                              type="text"
                              value={card.title}
                              onChange={(e) => handleUpdateWhyCard(card.id, 'title', e.target.value)}
                              className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#0f2d22] text-[10px]">Icon Identifier</label>
                            <select
                              value={card.icon}
                              onChange={(e) => handleUpdateWhyCard(card.id, 'icon', e.target.value)}
                              className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg"
                            >
                              <option value="ShieldCheck">Shield / Pure</option>
                              <option value="Sparkles">Sparkles / Cloth Sifted</option>
                              <option value="Award">Award / Quality</option>
                              <option value="CheckCircle">Checkmark / Certified</option>
                              <option value="Heart">Heart / Natural</option>
                              <option value="Truck">Truck / Direct Origin</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-[#0f2d22] text-[10px]">Description</label>
                            <textarea
                              rows={2}
                              value={card.description}
                              onChange={(e) => handleUpdateWhyCard(card.id, 'description', e.target.value)}
                              className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sojat / Factory Story Section */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
                <span className="font-bold text-[#0f2d22] text-sm">Sojat Factory & Complex Section</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.factorySectionEnabled ?? true}
                    onChange={(e) => updateField('factorySectionEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b4332]"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Section Heading</label>
                  <input
                    type="text"
                    value={settings.factorySectionHeading || ''}
                    onChange={(e) => updateField('factorySectionHeading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold"
                    placeholder="Crafted With Care In The Henna Capital Of India"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Factory Story Text</label>
                  <textarea
                    rows={3}
                    value={settings.factoryStory || ''}
                    onChange={(e) => updateField('factoryStory', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="Located in Sojat City, Pali, our processing facility houses..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Factory Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.factoryImageUrl || ''}
                      onChange={(e) => updateField('factoryImageUrl', e.target.value)}
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                      placeholder="https://..."
                    />
                    <label className="bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-3 py-2.5 rounded-xl cursor-pointer font-semibold flex items-center gap-1.5 shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => setMediaModalTarget('heroImageUrl')} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom WhatsApp Callout Section */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
                <span className="font-bold text-[#0f2d22] text-sm">Bottom WhatsApp Callout CTA Banner</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.finalCtaEnabled ?? true}
                    onChange={(e) => updateField('finalCtaEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b4332]"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Banner Heading</label>
                  <input
                    type="text"
                    value={settings.finalCtaHeading || ''}
                    onChange={(e) => updateField('finalCtaHeading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold"
                    placeholder="Ready To Order Pure Sojat Henna?"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Banner Description</label>
                  <input
                    type="text"
                    value={settings.finalCtaDescription || ''}
                    onChange={(e) => updateField('finalCtaDescription', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="We process retail and wholesale orders directly via WhatsApp..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Button Text</label>
                  <input
                    type="text"
                    value={settings.finalCtaButtonText || ''}
                    onChange={(e) => updateField('finalCtaButtonText', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                    placeholder="CHAT & ORDER ON WHATSAPP (+91 82337 03080)"
                  />
                </div>
              </div>
            </div>

            {/* Customer Testimonials & Reviews Section */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c5a059]" />
                  <span className="font-bold text-[#0f2d22] text-sm">Customer Testimonials & Reviews ({testimonials.length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddTestimonial}
                  className="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#0f2d22]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#c5a059]" /> Add Customer Review
                </button>
              </div>

              <div className="space-y-3">
                {testimonials.map((item, idx) => (
                  <div key={item.id} className="p-3.5 bg-white border border-[#e8e2d5] rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FAF8F5] border border-[#e8e2d5] text-[10px] font-bold text-[#1b4332] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-[#0f2d22]">{item.customerName || 'Anonymous Customer'}</span>
                        <span className="text-[10px] text-[#626c66]">({item.location || 'Location'})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateTestimonial(item.id, 'enabled', !item.enabled)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {item.enabled ? 'VISIBLE' : 'HIDDEN'}
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveTestimonial(idx, 'up')}
                          className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === testimonials.length - 1}
                          onClick={() => handleMoveTestimonial(idx, 'down')}
                          className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTestimonial(item.id)}
                          className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#0f2d22] text-[10px]">Customer Name</label>
                        <input
                          type="text"
                          value={item.customerName}
                          onChange={(e) => handleUpdateTestimonial(item.id, 'customerName', e.target.value)}
                          className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0f2d22] text-[10px]">Location / City</label>
                        <input
                          type="text"
                          value={item.location}
                          onChange={(e) => handleUpdateTestimonial(item.id, 'location', e.target.value)}
                          className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0f2d22] text-[10px]">Rating (1 to 5 Stars)</label>
                        <select
                          value={item.rating}
                          onChange={(e) => handleUpdateTestimonial(item.id, 'rating', parseInt(e.target.value))}
                          className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg font-bold"
                        >
                          <option value={5}>5 Stars (★★★★★)</option>
                          <option value={4}>4 Stars (★★★★☆)</option>
                          <option value={3}>3 Stars (★★★☆☆)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block font-semibold text-[#0f2d22] text-[10px]">Review Text</label>
                        <textarea
                          rows={2}
                          value={item.reviewText}
                          onChange={(e) => handleUpdateTestimonial(item.id, 'reviewText', e.target.value)}
                          className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
    </div>
  );
}
