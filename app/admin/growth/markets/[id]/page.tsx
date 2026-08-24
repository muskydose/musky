import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { ArrowLeft, MapPin, ShoppingBag, Users, Key, TrendingUp, AlertCircle } from 'lucide-react';
import { getMarketMetrics, getLeads, getKeywords } from '@/lib/growth/growth-db';
import { getOrdersForAnalytics } from '@/lib/db/orders';

export const dynamic = 'force-dynamic';

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: marketId } = await params;
  const metrics = await getMarketMetrics();
  const market = metrics.find((m) => m.marketId === marketId || m.id === marketId);

  if (!market) {
    return (
      <AdminLayout title="Growth AI — Market Detail">
        <div className="bg-white p-8 rounded-2xl border border-[#e8e2d5] text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg text-gray-800">Market Record Not Found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">No regional market matches ID: {marketId}</p>
          <Link
            href="/admin/growth/markets"
            className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Markets</span>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  // Related verified records
  const allOrders = await getOrdersForAnalytics();
  const marketOrders = allOrders.filter((o) => {
    const st = (o as any).state || o.customerState || '';
    return st.toLowerCase() === market.state.toLowerCase();
  });

  const allLeads = await getLeads();
  const marketLeads = allLeads.filter((l) => l.state?.toLowerCase() === market.state.toLowerCase());

  const allKeywords = await getKeywords();
  const marketKeywords = allKeywords.filter((k) => k.state?.toLowerCase() === market.state.toLowerCase() || !k.state);

  return (
    <AdminLayout title={`Growth AI — ${market.marketName}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/growth/markets"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Markets</span>
          </Link>
          <FreshnessBadge tier={market.sourceTier} sourceName={market.sourceName} />
        </div>

        {/* Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#1b4332]" />
                <h1 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">{market.marketName}</h1>
              </div>
              <p className="text-xs text-[#626c66] mt-1">
                State: <span className="font-semibold text-gray-800">{market.state}</span> | City/District:{' '}
                <span className="font-semibold text-gray-800">{market.district || market.city || 'General'}</span> | Pincode:{' '}
                <span className="font-semibold text-gray-800">{market.pincode || '—'}</span>
              </p>
            </div>

            <div className="bg-[#f0f7f3] border border-[#c2e2d0] p-4 rounded-xl text-center min-w-[180px]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332] block">Market Opportunity Score</span>
              <span className="text-3xl font-black text-[#0f2d22]">{market.marketOpportunityScore}/100</span>
            </div>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#e8e2d5]">
            <span className="text-xs text-gray-500 font-medium block">Verified Revenue</span>
            <span className="text-lg font-bold text-[#0f2d22] mt-1 block">₹{market.revenue.toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#e8e2d5]">
            <span className="text-xs text-gray-500 font-medium block">Orders Volume</span>
            <span className="text-lg font-bold text-[#0f2d22] mt-1 block">{market.ordersCount}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#e8e2d5]">
            <span className="text-xs text-gray-500 font-medium block">Average Order Value</span>
            <span className="text-lg font-bold text-[#0f2d22] mt-1 block">₹{Math.round(market.aov).toLocaleString()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#e8e2d5]">
            <span className="text-xs text-gray-500 font-medium block">Wholesale & CRM Leads</span>
            <span className="text-lg font-bold text-[#0f2d22] mt-1 block">{marketLeads.length}</span>
          </div>
        </div>

        {/* Opportunity Score Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5]">
          <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1b4332]" />
            <span>Opportunity Score Breakdown & Formula Evidence</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {Object.entries(market.scoreBreakdown || {}).map(([key, val]) => (
              <div key={key} className="p-3 bg-[#faf8f5] rounded-xl border border-[#e8e2d5]">
                <span className="capitalize text-gray-600 block">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-extrabold text-sm text-[#0f2d22] mt-0.5 block">+{val} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Orders Table */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#1b4332]" />
            <span>Verified Store Orders ({marketOrders.length})</span>
          </h3>
          {marketOrders.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 italic">No verified store orders recorded for this region.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-gray-600 font-bold uppercase">
                    <th className="p-2">Order #</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2">City</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d5]">
                  {marketOrders.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td className="p-2 font-bold text-[#1b4332]">{o.id}</td>
                      <td className="p-2 text-gray-800">{o.customerName || 'Customer'}</td>
                      <td className="p-2 text-gray-600">{(o as any).city || o.customerCity || '—'}</td>
                      <td className="p-2 text-right font-bold text-[#0f2d22]">₹{o.totalAmount.toLocaleString()}</td>
                      <td className="p-2 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Regional Leads & Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5]">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1b4332]" />
              <span>CRM Wholesale & Retailer Leads ({marketLeads.length})</span>
            </h3>
            {marketLeads.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 italic">No leads registered for this state.</p>
            ) : (
              <ul className="divide-y divide-[#e8e2d5] text-xs">
                {marketLeads.slice(0, 5).map((l) => (
                  <li key={l.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#0f2d22] block">{l.businessName}</span>
                      <span className="text-gray-500">{l.contactName} • {l.phone}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-700">{l.leadType}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5]">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#1b4332]" />
              <span>Tracked Regional Keywords ({marketKeywords.length})</span>
            </h3>
            {marketKeywords.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 italic">No custom keywords configured for this state.</p>
            ) : (
              <ul className="divide-y divide-[#e8e2d5] text-xs">
                {marketKeywords.slice(0, 5).map((k) => (
                  <li key={k.id} className="py-2.5 flex items-center justify-between">
                    <span className="font-bold text-[#0f2d22]">{k.keyword}</span>
                    <span className="text-gray-600 font-semibold">
                      {k.searchVolume != null ? `${k.searchVolume.toLocaleString()} / mo` : 'Unverified volume'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
