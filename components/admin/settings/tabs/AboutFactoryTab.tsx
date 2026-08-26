'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { FileText, Factory, Sparkles, Image, CheckCircle, Upload, Building } from 'lucide-react';

interface AboutFactoryTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  setMediaModalTarget: (target: 'logoUrl' | 'faviconUrl' | 'heroImageUrl' | 'factoryImageUrl' | 'ogImageUrl' | null) => void;
}

export default function AboutFactoryTab({
  settings,
  updateField,
  setSettings,
  setMediaModalTarget,
}: AboutFactoryTabProps) {
  return (
    <div className="space-y-6">
          <div className="space-y-8">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">About & Factory Pages CMS</h3>
              <p className="text-gray-500 mt-1">Manage public brand story, heritage messaging, image banners, and manufacturing process details.</p>
            </div>

            {/* ABOUT PAGE SECTION */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <h4 className="font-bold text-[#0f2d22] text-sm border-b border-[#e8e2d5] pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#c5a059]" />
                <span>About Us Page (/about)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Hero Eyebrow Tag</label>
                  <input
                    type="text"
                    value={settings.aboutHeroEyebrow || ''}
                    onChange={(e) => updateField('aboutHeroEyebrow', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="OUR SOJAT HERITAGE"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Hero Page Title</label>
                  <input
                    type="text"
                    value={settings.aboutHeroTitle || ''}
                    onChange={(e) => updateField('aboutHeroTitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="About Musky Dose"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Hero Subtitle</label>
                  <input
                    type="text"
                    value={settings.aboutHeroSubtitle || ''}
                    onChange={(e) => updateField('aboutHeroSubtitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Delivering authentic, highest-pigment Henna & pure Indian herbal wellness..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Story Section Eyebrow</label>
                  <input
                    type="text"
                    value={settings.aboutSectionEyebrow || ''}
                    onChange={(e) => updateField('aboutSectionEyebrow', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="THE HENNA CAPITAL OF INDIA"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Story Section Heading</label>
                  <input
                    type="text"
                    value={settings.aboutSectionHeading || ''}
                    onChange={(e) => updateField('aboutSectionHeading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="Rooted In Sojat, Rajasthan"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Primary Story Paragraph 1 (aboutText)</label>
                  <textarea
                    rows={3}
                    value={settings.aboutText || ''}
                    onChange={(e) => updateField('aboutText', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Musky Dose was established with a singular objective..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Secondary Story Paragraph 2 (aboutParagraph2)</label>
                  <textarea
                    rows={3}
                    value={settings.aboutParagraph2 || ''}
                    onChange={(e) => updateField('aboutParagraph2', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Sojat’s unique arid soil and climate naturally produce..."
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block font-bold text-[#0f2d22]">About Page Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.aboutImageUrl || ''}
                      onChange={(e) => updateField('aboutImageUrl', e.target.value)}
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl"
                      placeholder="https://..."
                    />
                    <label className="bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-3 py-2.5 rounded-xl cursor-pointer font-semibold flex items-center gap-1.5 shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => setMediaModalTarget('factoryImageUrl')} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* About Pillars */}
                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#e8e2d5]">
                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Pillar 1</span>
                    <input
                      type="text"
                      value={settings.aboutPillar1Title || ''}
                      onChange={(e) => updateField('aboutPillar1Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Zero Adulteration"
                    />
                    <textarea
                      rows={2}
                      value={settings.aboutPillar1Description || ''}
                      onChange={(e) => updateField('aboutPillar1Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="We never add chemicals..."
                    />
                  </div>

                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Pillar 2</span>
                    <input
                      type="text"
                      value={settings.aboutPillar2Title || ''}
                      onChange={(e) => updateField('aboutPillar2Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Ultra-Fine Sifted"
                    />
                    <textarea
                      rows={2}
                      value={settings.aboutPillar2Description || ''}
                      onChange={(e) => updateField('aboutPillar2Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="Our ultra-fine sifting..."
                    />
                  </div>

                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Pillar 3</span>
                    <input
                      type="text"
                      value={settings.aboutPillar3Title || ''}
                      onChange={(e) => updateField('aboutPillar3Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Farmer Empowerment"
                    />
                    <textarea
                      rows={2}
                      value={settings.aboutPillar3Description || ''}
                      onChange={(e) => updateField('aboutPillar3Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="Sourced directly from local..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FACTORY PAGE SECTION */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <h4 className="font-bold text-[#0f2d22] text-sm border-b border-[#e8e2d5] pb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#c5a059]" />
                <span>Our Factory & Lab Page (/factory)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Factory Hero Eyebrow</label>
                  <input
                    type="text"
                    value={settings.factoryHeroEyebrow || ''}
                    onChange={(e) => updateField('factoryHeroEyebrow', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="STATE-OF-THE-ART PROCESSING"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Factory Hero Title</label>
                  <input
                    type="text"
                    value={settings.factoryHeroTitle || ''}
                    onChange={(e) => updateField('factoryHeroTitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="Our Sojat Factory & Lab"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Factory Hero Subtitle</label>
                  <input
                    type="text"
                    value={settings.factoryHeroSubtitle || ''}
                    onChange={(e) => updateField('factoryHeroSubtitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Where traditional Rajasthani herbal expertise meets..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Main Process Section Heading</label>
                  <input
                    type="text"
                    value={settings.factorySectionHeading || ''}
                    onChange={(e) => updateField('factorySectionHeading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="Hygienic Manufacturing & Processing Steps"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Factory Process Description (factoryStory)</label>
                  <textarea
                    rows={3}
                    value={settings.factoryStory || ''}
                    onChange={(e) => updateField('factoryStory', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Located in Sojat City, Pali district, our plant handles..."
                  />
                </div>

                {/* 4 Steps */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e8e2d5]">
                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Step 1</span>
                    <input
                      type="text"
                      value={settings.factoryStep1Title || ''}
                      onChange={(e) => updateField('factoryStep1Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Solar Shade Drying"
                    />
                    <textarea
                      rows={2}
                      value={settings.factoryStep1Description || ''}
                      onChange={(e) => updateField('factoryStep1Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="Leaves are shade-dried..."
                    />
                  </div>

                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Step 2</span>
                    <input
                      type="text"
                      value={settings.factoryStep2Title || ''}
                      onChange={(e) => updateField('factoryStep2Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Micro Pulverization"
                    />
                    <textarea
                      rows={2}
                      value={settings.factoryStep2Description || ''}
                      onChange={(e) => updateField('factoryStep2Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="Heavy-duty food-grade..."
                    />
                  </div>

                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Step 3</span>
                    <input
                      type="text"
                      value={settings.factoryStep3Title || ''}
                      onChange={(e) => updateField('factoryStep3Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Ultra-Fine Cloth Sifting"
                    />
                    <textarea
                      rows={2}
                      value={settings.factoryStep3Description || ''}
                      onChange={(e) => updateField('factoryStep3Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="Milled powder passes..."
                    />
                  </div>

                  <div className="p-3 bg-white border border-[#e8e2d5] rounded-xl space-y-2">
                    <span className="font-bold text-[#0f2d22] text-[11px] uppercase">Step 4</span>
                    <input
                      type="text"
                      value={settings.factoryStep4Title || ''}
                      onChange={(e) => updateField('factoryStep4Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg font-bold"
                      placeholder="Vacuum Pouch Sealing"
                    />
                    <textarea
                      rows={2}
                      value={settings.factoryStep4Description || ''}
                      onChange={(e) => updateField('factoryStep4Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-[11px]"
                      placeholder="Packed in nitrogen-flushed..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* WHOLESALE PAGE SECTION */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <h4 className="font-bold text-[#0f2d22] text-sm border-b border-[#e8e2d5] pb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#c5a059]" />
                <span>Wholesale & B2B Page (/wholesale)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Wholesale Hero Title</label>
                  <input
                    type="text"
                    value={settings.wholesaleHeroTitle || ''}
                    onChange={(e) => updateField('wholesaleHeroTitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="Bulk Henna & Herbal Supply Direct From Sojat, Rajasthan"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Enquiry Form Heading</label>
                  <input
                    type="text"
                    value={settings.wholesaleSectionHeading || ''}
                    onChange={(e) => updateField('wholesaleSectionHeading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                    placeholder="Request Wholesale Price Quote"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Wholesale Hero Subtitle</label>
                  <textarea
                    rows={2}
                    value={settings.wholesaleHeroSubtitle || ''}
                    onChange={(e) => updateField('wholesaleHeroSubtitle', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="We partner with salons, distributors, retailers, and exporters worldwide..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0f2d22] mb-1">Enquiry Form Description</label>
                  <input
                    type="text"
                    value={settings.wholesaleSectionDescription || ''}
                    onChange={(e) => updateField('wholesaleSectionDescription', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                    placeholder="Fill out the details below and our trade team will respond within 24 hours."
                  />
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
