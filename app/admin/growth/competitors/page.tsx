import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { ShieldAlert, Plus, Search, Filter, ExternalLink, Tag } from 'lucide-react';
import { getCompetitors } from '@/lib/growth/growth-db';

export const dynamic = 'force-dynamic';

export default async function GrowthCompetitorsPage() {
  const competitors = await getCompetitors();

  return (
    <AdminLayout title="Growth AI — Regional Competitor System">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
              Competitor Directory & Price Observations
            </h1>
            <p className="text-xs text-[#626c66] mt-0.5">
              Verified market positioning, price tracking, and product category coverage across regional Indian brands
            </p>
          </div>
        </div>

        {/* Competitor List */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#1b4332]" />
              <span>Tracked Regional Competitors ({competitors.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-gray-600 font-bold uppercase">
                  <th className="p-3">Brand Name</th>
                  <th className="p-3">Primary Category</th>
                  <th className="p-3">Market Region</th>
                  <th className="p-3">Price Point</th>
                  <th className="p-3">Data Source</th>
                  <th className="p-3">Observations Count</th>
                  <th className="p-3">Last Checked</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {competitors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                      No competitor entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  competitors.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fdfbf7]">
                      <td className="p-3 font-bold text-[#0f2d22]">{c.name}</td>
                      <td className="p-3 font-medium text-[#1b4332]">{c.productCategories?.join(', ') || 'General Henna'}</td>
                      <td className="p-3 text-gray-600">{c.state || c.city || 'India-wide'}</td>
                      <td className="p-3 text-gray-800 font-semibold">{c.positioning || 'Mid-range'}</td>
                      <td className="p-3 text-gray-500">{c.sourceName || 'Manual Market Audit'}</td>
                      <td className="p-3 text-center font-bold text-[#0f2d22]">1</td>
                      <td className="p-3 text-gray-500">
                        {c.lastCheckedAt ? new Date(c.lastCheckedAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">{c.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
