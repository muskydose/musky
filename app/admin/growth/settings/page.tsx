'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { GrowthSettings } from '@/lib/growth/types';
import { Sliders, Save, CheckCircle2 } from 'lucide-react';

export default function GrowthSettingsPage() {
  const [settings, setSettings] = useState<GrowthSettings>({
    weights: {
      sales: 30,
      growth: 20,
      leads: 15,
      wholesale: 15,
      productFit: 10,
      campaignResponse: 10,
    },
    minOrdersForScore: 1,
    staleDataDays: 14,
    aiEnabled: true,
    minConfidenceThreshold: 60,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/growth/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.settings) setSettings(data.settings);
      });
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/admin/growth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout title="Growth AI — Engine Configuration & Weights">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6 max-w-3xl">
        <div className="border-b border-[#e8e2d5] pb-4">
          <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
            Scoring Weights & Threshold Configuration
          </h3>
          <p className="text-xs text-[#626c66] mt-0.5">
            Configure Market Opportunity Score component distribution and stale data decay limits
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <h4 className="font-bold text-[#0f2d22] text-sm">Market Opportunity Score Weight Distribution (Total: 100 pts)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Sales Performance (Max Pts)</label>
              <input
                type="number"
                value={settings.weights.sales}
                onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, sales: parseInt(e.target.value) || 0 } })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Customer Growth & Repeat Rate</label>
              <input
                type="number"
                value={settings.weights.growth}
                onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, growth: parseInt(e.target.value) || 0 } })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">CRM Lead Volume</label>
              <input
                type="number"
                value={settings.weights.leads}
                onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, leads: parseInt(e.target.value) || 0 } })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Wholesale Activity</label>
              <input
                type="number"
                value={settings.weights.wholesale}
                onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, wholesale: parseInt(e.target.value) || 0 } })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="font-bold text-[#0f2d22] text-sm">Data Decay & Freshness Settings</h4>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Stale Data Threshold (Days)</label>
              <input
                type="number"
                value={settings.staleDataDays}
                onChange={(e) => setSettings({ ...settings, staleDataDays: parseInt(e.target.value) || 14 })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex items-center justify-between">
            {saved && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Settings Saved!
              </span>
            )}
            <button
              onClick={handleSave}
              className="ml-auto inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1b4332] text-white font-bold text-xs rounded-xl hover:bg-[#0f2d22]"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
