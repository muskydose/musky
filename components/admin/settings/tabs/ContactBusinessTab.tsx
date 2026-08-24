'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { Phone, Mail, MapPin, Globe, Share2, AlertCircle, MessageCircle } from 'lucide-react';

interface ContactBusinessTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
  updateSocial: (network: 'instagram' | 'facebook' | 'youtube' | 'twitter', value: string) => void;
  validationErrors: Record<string, string>;
}

export default function ContactBusinessTab({
  settings,
  updateField,
  updateSocial,
  validationErrors,
}: ContactBusinessTabProps) {
  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Contact Numbers, Address & Social Links</h3>
              <p className="text-gray-500 mt-1">Configure business location details and social media profile URLs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">WhatsApp Order Destination Number *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={settings.whatsappNumber || ''}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    className={`w-full p-3 bg-[#fcfbf7] border rounded-xl font-bold text-[#25D366] ${
                      validationErrors.whatsappNumber ? 'border-red-500 bg-red-50' : 'border-[#e8e2d5]'
                    }`}
                    placeholder="e.g. 918233703080"
                  />
                  <MessageCircle className="w-5 h-5 text-[#25D366] absolute right-3 top-3 pointer-events-none fill-[#25D366]" />
                </div>
                {validationErrors.whatsappNumber ? (
                  <p className="text-red-500 text-[10px] mt-1 font-semibold">{validationErrors.whatsappNumber}</p>
                ) : (
                  <p className="text-gray-500 text-[10px] mt-1">Country code prefix mandatory without + (e.g., 918233703080 for India).</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Direct Phone / Display Phone Call Number</label>
                <input
                  type="text"
                  value={settings.displayPhone || ''}
                  onChange={(e) => updateField('displayPhone', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="+91 82337 03080"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Public Email Address</label>
                <input
                  type="email"
                  value={settings.businessEmail || ''}
                  onChange={(e) => updateField('businessEmail', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="info@muskydose.in"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Business Working Hours</label>
                <input
                  type="text"
                  value={settings.businessHours || ''}
                  onChange={(e) => updateField('businessHours', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Monday – Saturday: 9:00 AM – 7:00 PM IST"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">Sojat Factory / Office Street Address</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Musky Dose Herbal Complex, Station Road, Sojat City, Pali District, Rajasthan - 306104, India"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">City / Town</label>
                <input
                  type="text"
                  value={settings.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Sojat City"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">State / Province</label>
                <input
                  type="text"
                  value={settings.state || ''}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Rajasthan"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Pincode / Postal Code</label>
                <input
                  type="text"
                  value={settings.pincode || ''}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="306104"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Country</label>
                <input
                  type="text"
                  value={settings.country || ''}
                  onChange={(e) => updateField('country', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="India"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-[#e8e2d5] space-y-4">
              <h4 className="font-bold text-[#0f2d22]">Social Media Profile Links</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 mb-1">Instagram URL</label>
                  <input
                    type="text"
                    value={settings.socials?.instagram || ''}
                    onChange={(e) => updateSocial('instagram', e.target.value)}
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                    placeholder="https://instagram.com/muskydose"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Facebook URL</label>
                  <input
                    type="text"
                    value={settings.socials?.facebook || ''}
                    onChange={(e) => updateSocial('facebook', e.target.value)}
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                    placeholder="https://facebook.com/muskydose"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">YouTube URL</label>
                  <input
                    type="text"
                    value={settings.socials?.youtube || ''}
                    onChange={(e) => updateSocial('youtube', e.target.value)}
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                    placeholder="https://youtube.com/muskydose"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Twitter / X URL</label>
                  <input
                    type="text"
                    value={settings.socials?.twitter || ''}
                    onChange={(e) => updateSocial('twitter', e.target.value)}
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                    placeholder="https://twitter.com/muskydose"
                  />
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
