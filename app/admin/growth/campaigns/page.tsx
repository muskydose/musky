import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { Tag, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { getCampaignAnalytics } from '@/lib/growth/analytics';

export const dynamic = 'force-dynamic';

export default async function GrowthCampaignsPage() {
  const campaigns = await getCampaignAnalytics();

  return (
    <AdminLayout title="Growth AI — Campaign Intelligence">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
            Campaign Performance & Ad Spend Status
          </h1>
          <p className="text-xs text-[#626c66] mt-0.5">
            Real order revenue tied to active discount codes with explicit ad spend connection status
          </p>
        </div>

        {/* Ad Spend Disclosure Banner */}
        <div className="bg-[#fffbeb] border border-[#fef3c7] p-4 rounded-xl text-xs text-[#92400e] flex items-start gap-3">
          <Info className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Transparent Campaign ROI Policy:</span>
            <p className="mt-0.5 text-gray-700">
              ROI calculations require verified ad spend data from Meta Ads, Google Ads, or manual expense records. When spend data is not connected, ROI is explicitly marked as <strong className="text-amber-900 font-semibold">“ROI unavailable — advertising cost data not connected”</strong> to prevent fabricated marketing metrics.
            </p>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#1b4332]" />
              <span>Active & Historic Store Campaigns ({campaigns.length})</span>
            </h3>
            <Link
              href="/admin/marketing/campaigns"
              className="text-xs font-bold text-[#1b4332] hover:underline"
            >
              Manage Campaign Codes →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-gray-600 font-bold uppercase">
                  <th className="p-3">Campaign Name</th>
                  <th className="p-3">Promo Code</th>
                  <th className="p-3">Discount Type</th>
                  <th className="p-3 text-right">Orders Tagged</th>
                  <th className="p-3 text-right">Attributed Revenue</th>
                  <th className="p-3 text-right">Avg Order Value</th>
                  <th className="p-3">ROI Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 italic">
                      No store campaigns created yet. Create promo codes in Admin Marketing to track campaign sales.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fdfbf7]">
                      <td className="p-3 font-bold text-[#0f2d22]">{c.name}</td>
                      <td className="p-3 font-mono font-bold text-[#1b4332]">{c.code || 'N/A'}</td>
                      <td className="p-3 text-gray-600">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </td>
                      <td className="p-3 text-right font-bold text-[#0f2d22]">{c.ordersCount}</td>
                      <td className="p-3 text-right font-extrabold text-[#1b4332]">₹{c.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">₹{Math.round(c.avgOrderValue).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>{c.roiStatus}</span>
                        </span>
                      </td>
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
