'use client';

import React, { useState } from 'react';
import { SiteSettings } from '@/lib/types';
import {
  ShieldCheck,
  Globe,
  Save,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface SeoIndexingVerificationTabProps {
  siteSettings: SiteSettings;
  onSaveSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
}

export default function SeoIndexingVerificationTab({
  siteSettings,
  onSaveSiteSettings,
}: SeoIndexingVerificationTabProps) {
  const [verificationTag, setVerificationTag] = useState(siteSettings.googleSearchConsoleVerification || '');
  const [canonicalUrl, setCanonicalUrl] = useState(siteSettings.canonicalUrl || siteSettings.websiteUrl || 'https://muskydose.in');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveSiteSettings({
        googleSearchConsoleVerification: verificationTag,
        canonicalUrl,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save verification settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyMeta = () => {
    const meta = `<meta name="google-site-verification" content="${verificationTag}" />`;
    navigator.clipboard.writeText(meta);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e8e2d5] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#e8f3ed] text-[#183F2B] rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f2d22]">Google Search Console Verification</h2>
              <p className="text-xs text-[#626c66]">
                Provide your Google HTML meta tag verification token to verify website ownership and monitor indexing status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183F2B] text-white text-xs font-bold rounded-xl hover:bg-[#123021] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{saving ? 'Saving...' : 'Save Verification'}</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Google verification settings saved to database.</span>
          </div>
        )}

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[#626c66] mb-1">
              Google Site Verification Token (content attribute)
            </label>
            <input
              type="text"
              value={verificationTag}
              onChange={(e) => setVerificationTag(e.target.value)}
              placeholder="e.g. wX4-Y_zABcDeFgHiJkLmNoPqRsTuVwXyZ12345"
              className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl font-mono text-xs text-[#0f2d22]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#626c66] mb-1">
              Canonical Domain Base URL
            </label>
            <input
              type="text"
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder="https://muskydose.in"
              className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl font-mono text-xs text-[#0f2d22]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
