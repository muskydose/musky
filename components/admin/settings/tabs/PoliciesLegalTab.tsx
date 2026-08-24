'use client';

import React from 'react';
import { SiteSettings, PolicyContent } from '@/lib/types';
import { FileText, Shield, Truck, RotateCcw, AlertTriangle } from 'lucide-react';

interface PoliciesLegalTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
}

export default function PoliciesLegalTab({ settings, updateField }: PoliciesLegalTabProps) {
  const updatePolicy = (key: 'shippingPolicy' | 'returnRefundPolicy' | 'privacyPolicy' | 'termsConditions', field: keyof PolicyContent, value: any) => {
    const current = (settings[key] as PolicyContent) || { title: '', content: '', enabled: true };
    updateField(key, { ...current, [field]: value });
  };

  const policies: { key: 'shippingPolicy' | 'returnRefundPolicy' | 'privacyPolicy' | 'termsConditions'; title: string; icon: any; defaultTitle: string }[] = [
    { key: 'shippingPolicy', title: 'Shipping & Delivery Policy', icon: Truck, defaultTitle: 'Shipping & Delivery Policy' },
    { key: 'returnRefundPolicy', title: 'Return & Refund Policy', icon: RotateCcw, defaultTitle: 'Return & Refund Policy' },
    { key: 'privacyPolicy', title: 'Privacy Policy', icon: Shield, defaultTitle: 'Privacy Policy' },
    { key: 'termsConditions', title: 'Terms & Conditions', icon: FileText, defaultTitle: 'Terms & Conditions' },
  ];

  return (
    <div className="space-y-6">
      {policies.map((p) => {
        const Icon = p.icon;
        const policy = settings[p.key] || { title: p.defaultTitle, content: '', enabled: true };

        return (
          <div key={p.key} className="bg-white border border-[#e8e2d5] p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#e8f3ed] text-[#183F2B] rounded-xl">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0f2d22]">{p.title}</h2>
                  <p className="text-xs text-[#626c66]">Customizable legal text rendered on /{p.key.replace(/([A-Z])/g, '-$1').toLowerCase()}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updatePolicy(p.key, 'enabled', !policy.enabled)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  policy.enabled ? 'bg-[#183F2B] text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {policy.enabled ? 'Published' : 'Draft / Disabled'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#626c66] mb-1">Page Title</label>
              <input
                type="text"
                value={policy.title || ''}
                onChange={(e) => updatePolicy(p.key, 'title', e.target.value)}
                className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-sm text-[#0f2d22]"
                placeholder={p.defaultTitle}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#626c66] mb-1">Policy Content (Markdown / HTML / Plain Text)</label>
              <textarea
                rows={6}
                value={policy.content || ''}
                onChange={(e) => updatePolicy(p.key, 'content', e.target.value)}
                className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl text-sm text-[#0f2d22] font-mono leading-relaxed"
                placeholder="Enter complete legal terms and policies here..."
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
