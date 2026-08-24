import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { getMarketMetrics } from '@/lib/growth/growth-db';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { MapPin, Search, Plus, Filter, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GrowthMarketsPage() {
  const metrics = await getMarketMetrics();

  return (
    <AdminLayout title="Growth AI — Market Master Intelligence">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
          <div>
            <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
              Indian Market Master Directory
            </h3>
            <p className="text-xs text-[#626c66] mt-0.5">
              Structured geographical breakdown with derived opportunity scores and verified revenue metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/growth/map"
              className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0f2d22]"
            >
              <MapPin className="w-4 h-4" />
              <span>Interactive India Heatmap</span>
            </Link>
          </div>
        </div>

        {metrics.length === 0 ? (
          <div className="p-12 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#e8e2d5]">
            <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="font-bold text-gray-700 text-sm">No verified data available yet.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Import a verified dataset or process store orders to populate regional markets automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-[#626c66] uppercase tracking-wider font-bold">
                  <th className="p-3">Market Name</th>
                  <th className="p-3">State</th>
                  <th className="p-3">District / City</th>
                  <th className="p-3 text-right">Revenue</th>
                  <th className="p-3 text-right">Orders</th>
                  <th className="p-3 text-right">Leads</th>
                  <th className="p-3 text-center">Opportunity Score</th>
                  <th className="p-3">Source Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {metrics.map((m) => (
                  <tr key={m.id} className="hover:bg-[#fdfbf7]">
                    <td className="p-3 font-bold text-[#0f2d22]">
                      <Link href={`/admin/growth/markets/${m.marketId}`} className="hover:underline text-[#1b4332] flex items-center gap-1">
                        <span>{m.marketName}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                      </Link>
                    </td>
                    <td className="p-3 text-gray-700">{m.state}</td>
                    <td className="p-3 text-gray-600">{m.district || m.city || '—'}</td>
                    <td className="p-3 text-right font-bold text-[#0f2d22]">₹{m.revenue.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-700">{m.ordersCount}</td>
                    <td className="p-3 text-right text-gray-700">{m.wholesaleLeadsCount}</td>
                    <td className="p-3 text-center">
                      <span className="font-extrabold px-2.5 py-1 rounded bg-[#e8f3ed] text-[#1b4332]">
                        {m.marketOpportunityScore}/100
                      </span>
                    </td>
                    <td className="p-3">
                      <FreshnessBadge tier={m.sourceTier} />
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
