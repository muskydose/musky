'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { DEFAULT_WHATSAPP_TEMPLATE, renderWhatsAppTemplate } from '@/lib/whatsapp';
import { MessageCircle, Code, HelpCircle, Sparkles, Building, RefreshCw } from 'lucide-react';

const DEFAULT_WHOLESALE_TEMPLATE = 'Hello Musky Dose Wholesale Team, I would like to inquire about bulk henna pricing and catalog.';
const getWhatsAppPreviewMessage = (template: string, _brand?: string, _phone?: string) =>
  template.replace(/{customer_name}/g, 'Rahul Sharma').replace(/{order_id}/g, 'MD-84920');

interface WhatsAppTemplatesTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
}

export default function WhatsAppTemplatesTab({ settings, updateField, validationErrors = {} }: WhatsAppTemplatesTabProps & { validationErrors?: Record<string, string> }) {
  const insertPlaceholder = (fieldName: 'whatsappMessageTemplate' | 'whatsappWholesaleMessageTemplate', tag: string) => {
    const current = (settings[fieldName] as string) || '';
    updateField(fieldName, current + ' ' + tag);
  };

  return (
    <div className="space-y-6">
          <div className="space-y-8">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">WhatsApp Message Template Manager</h3>
              <p className="text-gray-500 mt-1">
                Customize pre-formatted WhatsApp text strings generated when customers order or send wholesale enquiries.
              </p>
            </div>

            {/* Order Template Section */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e2d5] pb-3">
                <div>
                  <label className="font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                    <span>Customer Order Message Template</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Pre-filled message when customer clicks &quot;Continue on WhatsApp&quot; at checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset order message template to default?')) {
                      updateField('whatsappMessageTemplate', DEFAULT_WHATSAPP_TEMPLATE);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f5f1e8] text-[#0f2d22] border border-[#e8e2d5] rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#1b4332]" />
                  <span>Reset Order Template</span>
                </button>
              </div>

              {/* Tag Badges */}
              <div>
                <div className="text-[10px] font-bold text-[#0f2d22] mb-1.5 uppercase tracking-wider">
                  Click to Insert Placeholder Tag:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{orderNumber}',
                    '{customerName}',
                    '{phone}',
                    '{whatsapp}',
                    '{houseShop}',
                    '{address}',
                    '{area}',
                    '{landmark}',
                    '{city}',
                    '{state}',
                    '{pincode}',
                    '{products}',
                    '{subtotal}',
                    '{discount}',
                    '{shipping}',
                    '{total}',
                    '{notes}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertPlaceholder('whatsappMessageTemplate', tag)}
                      className="bg-white hover:bg-[#1b4332] hover:text-white text-[#1b4332] border border-[#1b4332]/20 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all shadow-2xs"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  rows={8}
                  value={settings.whatsappMessageTemplate || ''}
                  onChange={(e) => updateField('whatsappMessageTemplate', e.target.value)}
                  className={`w-full p-3.5 bg-white border rounded-xl text-xs font-mono text-[#0f2d22] leading-relaxed shadow-xs ${
                    validationErrors.whatsappMessageTemplate ? 'border-red-500 bg-red-50' : 'border-[#e8e2d5]'
                  }`}
                  placeholder={DEFAULT_WHATSAPP_TEMPLATE}
                />
                {validationErrors.whatsappMessageTemplate && (
                  <p className="text-red-500 text-[10px] mt-1 font-semibold">{validationErrors.whatsappMessageTemplate}</p>
                )}
              </div>

              {/* Live Preview */}
              <div className="p-4 rounded-xl bg-emerald-95/80 border border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                    <span>Live Order Message Preview</span>
                  </span>
                  <span className="bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded font-mono">
                    SAMPLE DATA
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-100 font-mono text-[11px] text-[#0f2d22] whitespace-pre-line leading-relaxed shadow-2xs">
                  {getWhatsAppPreviewMessage(
                    settings.whatsappMessageTemplate || DEFAULT_WHATSAPP_TEMPLATE,
                    settings.brandName,
                    settings.whatsappNumber
                  )}
                </div>
              </div>
            </div>

            {/* Wholesale Template Section */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e2d5] pb-3">
                <div>
                  <label className="font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#c5a059]" />
                    <span>Wholesale & Bulk Enquiry Message Template</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Pre-filled message when customer submits a wholesale enquiry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset wholesale message template to default?')) {
                      updateField('whatsappWholesaleMessageTemplate', DEFAULT_WHOLESALE_TEMPLATE);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f5f1e8] text-[#0f2d22] border border-[#e8e2d5] rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#1b4332]" />
                  <span>Reset Wholesale Template</span>
                </button>
              </div>

              {/* Tag Badges */}
              <div>
                <div className="text-[10px] font-bold text-[#0f2d22] mb-1.5 uppercase tracking-wider">
                  Click to Insert Wholesale Tag:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{customerName}',
                    '{businessName}',
                    '{phone}',
                    '{whatsapp}',
                    '{email}',
                    '{city}',
                    '{state}',
                    '{products}',
                    '{quantity}',
                    '{notes}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertPlaceholder('whatsappWholesaleMessageTemplate', tag)}
                      className="bg-white hover:bg-[#1b4332] hover:text-white text-[#1b4332] border border-[#1b4332]/20 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all shadow-2xs"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  rows={7}
                  value={settings.whatsappWholesaleMessageTemplate || DEFAULT_WHOLESALE_TEMPLATE}
                  onChange={(e) => updateField('whatsappWholesaleMessageTemplate', e.target.value)}
                  className="w-full p-3.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-mono text-[#0f2d22] leading-relaxed shadow-xs"
                  placeholder={DEFAULT_WHOLESALE_TEMPLATE}
                />
              </div>

              {/* Live Preview */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/60 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Live Wholesale Message Preview</span>
                  </span>
                  <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded font-mono">
                    SAMPLE DATA
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-100 font-mono text-[11px] text-[#0f2d22] whitespace-pre-line leading-relaxed shadow-2xs">
                  {renderWhatsAppTemplate(
                    settings.whatsappWholesaleMessageTemplate || DEFAULT_WHOLESALE_TEMPLATE,
                    {
                      customerName: 'Rajesh Mehendi Art (Sample)',
                      businessName: 'Rajesh Enterprise',
                      phone: '9876543210',
                      whatsapp: '9876543210',
                      email: 'rajesh@example.com',
                      city: 'Jaipur',
                      state: 'Rajasthan',
                      products: '1. Sojat Henna Powder (100kg)\n2. Pure Indigo Powder (50kg)',
                      quantity: '150 kg',
                      notes: 'Urgent delivery required to Jaipur hub',
                    }
                  )}
                </div>
              </div>
            </div>

{/* WhatsApp 3-Step Ordering Guide (Customer Storefront) */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="border-b border-[#e8e2d5] pb-3">
                <label className="font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Homepage 3-Step WhatsApp Ordering Guide</span>
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Configure the titles and instructions displayed in the &quot;Simple 3-Step WhatsApp Ordering&quot; section on the homepage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#0f2d22] text-xs mb-1">Section Heading</label>
                  <input
                    type="text"
                    value={settings.whatsappGuideHeading || ''}
                    onChange={(e) => updateField('whatsappGuideHeading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="Simple 3-Step WhatsApp Ordering"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0f2d22] text-xs mb-1">Section Subheading / Eyebrow</label>
                  <input
                    type="text"
                    value={settings.whatsappGuideSubheading || ''}
                    onChange={(e) => updateField('whatsappGuideSubheading', e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="HOW ORDERING WORKS"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] text-xs mb-1">Section Description</label>
                <textarea
                  rows={2}
                  value={settings.whatsappGuideDescription || ''}
                  onChange={(e) => updateField('whatsappGuideDescription', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="We operate a direct WhatsApp ordering model so you receive personal service and prompt response directly from Sojat."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Step 1 */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#1b4332]">
                    <span className="w-5 h-5 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Step 1: Product Selection</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Step 1 Title</label>
                    <input
                      type="text"
                      value={settings.whatsappStep1Title || ''}
                      onChange={(e) => updateField('whatsappStep1Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold text-[#0f2d22]"
                      placeholder="Select Your Products"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Step 1 Description</label>
                    <textarea
                      rows={3}
                      value={settings.whatsappStep1Description || ''}
                      onChange={(e) => updateField('whatsappStep1Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22]"
                      placeholder="Browse available Musky Dose products and add your required items..."
                    />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#25D366]">
                    <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Step 2: WhatsApp Connect</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Step 2 Title</label>
                    <input
                      type="text"
                      value={settings.whatsappStep2Title || ''}
                      onChange={(e) => updateField('whatsappStep2Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold text-[#0f2d22]"
                      placeholder="Order on WhatsApp"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Step 2 Description</label>
                    <textarea
                      rows={3}
                      value={settings.whatsappStep2Description || ''}
                      onChange={(e) => updateField('whatsappStep2Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22]"
                      placeholder="Click Order on WhatsApp to open formatted message..."
                    />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#1b4332]">
                    <span className="w-5 h-5 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Step 3: Direct Dispatch</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Step 3 Title</label>
                    <input
                      type="text"
                      value={settings.whatsappStep3Title || ''}
                      onChange={(e) => updateField('whatsappStep3Title', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold text-[#0f2d22]"
                      placeholder="Direct Sojat Dispatch"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Step 3 Description</label>
                    <textarea
                      rows={3}
                      value={settings.whatsappStep3Description || ''}
                      onChange={(e) => updateField('whatsappStep3Description', e.target.value)}
                      className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22]"
                      placeholder="Confirm delivery address and payment. We package and dispatch..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Greeting Message */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-3">
              <label className="block font-bold text-[#0f2d22]">WhatsApp Initial Greeting Line</label>
              <input
                type="text"
                value={settings.whatsappGreeting || ''}
                onChange={(e) => updateField('whatsappGreeting', e.target.value)}
                className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                placeholder="Namaste! Welcome to Musky Dose Sojat. How can we assist you today?"
              />
            </div>
          </div>
    </div>
  );
}
