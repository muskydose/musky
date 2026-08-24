'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { GrowthKeyword } from '@/lib/growth/types';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { Search, Plus, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function GrowthKeywordsPage() {
  const [keywords, setKeywords] = useState<GrowthKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const res = await fetch('/api/admin/growth/keywords');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setKeywords(data.keywords || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Growth AI — Regional Search & Keyword Demands">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
          <div>
            <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
              Regional Keyword & Search Demands
            </h3>
            <p className="text-xs text-[#626c66] mt-0.5">
              Analyze botanical henna, bridal mehndi cone, and natural herbal search queries
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#e8e2d5]">
            <Search className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="font-bold text-gray-700 text-sm">No verified search keyword data available yet.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Import a verified CSV keyword dataset or enable data source connectors in Data Sources to populate search metrics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-[#626c66] uppercase tracking-wider font-bold">
                  <th className="p-3">Keyword Query</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Search Volume</th>
                  <th className="p-3">Competition</th>
                  <th className="p-3">Source Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {filtered.map((k) => (
                  <tr key={k.id} className="hover:bg-[#fdfbf7]">
                    <td className="p-3 font-bold text-[#0f2d22]">{k.keyword}</td>
                    <td className="p-3 text-gray-600">{k.category || 'General Henna'}</td>
                    <td className="p-3 text-right font-bold text-[#0f2d22]">
                      {k.searchVolume ? k.searchVolume.toLocaleString() : 'Unavailable'}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {k.competition || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="p-3">
                      <FreshnessBadge tier={k.sourceTier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
