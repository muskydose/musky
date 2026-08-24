'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { GrowthDataSource } from '@/lib/growth/types';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { Database, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function GrowthDataSourcesPage() {
  const [sources, setSources] = useState<GrowthDataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/admin/growth/data-sources');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setSources(data.dataSources || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async (providerKey: string) => {
    setSyncingKey(providerKey);
    try {
      const res = await fetch('/api/admin/growth/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerKey }),
      });
      if (res.ok) fetchSources();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingKey(null);
    }
  };

  return (
    <AdminLayout title="Growth AI — Data Sources & Provider Adapters">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
        <div className="border-b border-[#e8e2d5] pb-4">
          <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
            Free-First / Provider-Independent Architecture
          </h3>
          <p className="text-xs text-[#626c66] mt-0.5">
            Decoupled source adapters maintain local cached datasets if external APIs become disconnected
          </p>
        </div>

        <div className="space-y-4">
          {sources
            .filter((ds) => ds.providerKey !== 'google_ads_keywords' && ds.status !== 'Disabled')
            .map((ds) => (
            <div key={ds.id} className="bg-[#fdfbf7] p-5 rounded-2xl border border-[#e8e2d5] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[#0f2d22] text-base">{ds.name}</h4>
                  <FreshnessBadge status={ds.status} />
                </div>
                <p className="text-xs text-gray-600">
                  Provider Key: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{ds.providerKey}</code> • Type: {ds.type}
                </p>
                <p className="text-xs text-gray-500">
                  Stored Records: <strong>{ds.recordsCount}</strong> • Last Synced: {ds.lastSyncedAt ? new Date(ds.lastSyncedAt).toLocaleString() : 'Never'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTriggerSync(ds.providerKey)}
                  disabled={syncingKey === ds.providerKey}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b4332] text-white font-bold text-xs rounded-xl hover:bg-[#0f2d22] disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingKey === ds.providerKey ? 'animate-spin' : ''}`} />
                  <span>{syncingKey === ds.providerKey ? 'Syncing...' : 'Sync Dataset'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
