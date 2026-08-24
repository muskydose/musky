'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GrowthMarketMetric } from '@/lib/growth/types';
import FreshnessBadge from './FreshnessBadge';
import { MapPin, ArrowRight } from 'lucide-react';
import { INDIAN_STATES_AND_UTS } from '@/lib/growth/geography';

interface IndiaHeatmapProps {
  metrics: GrowthMarketMetric[];
  onSelectMarket?: (market: GrowthMarketMetric) => void;
}

type MetricKey = 'revenue' | 'ordersCount' | 'customersCount' | 'wholesaleLeadsCount' | 'marketOpportunityScore';

export default function IndiaHeatmap({ metrics, onSelectMarket }: IndiaHeatmapProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('revenue');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');

  const filteredMetrics = selectedStateFilter === 'ALL'
    ? metrics
    : metrics.filter((m) => m.state.toLowerCase() === selectedStateFilter.toLowerCase());

  return (
    <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#1b4332]" />
            <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
              India Regional Micro-Market Heatmap
            </h3>
          </div>
          <p className="text-xs text-[#626c66] mt-0.5">
            Geographic performance mapped across all 28 Indian States & 8 Union Territories from verified store activity
          </p>
        </div>

        {/* Metric Selector Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#f5f1e8] p-1.5 rounded-xl border border-[#e8e2d5]">
          {(['revenue', 'ordersCount', 'wholesaleLeadsCount', 'marketOpportunityScore'] as MetricKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMetric === key
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#626c66] hover:text-[#0f2d22] hover:bg-white/60'
              }`}
            >
              {key === 'revenue' && 'Revenue'}
              {key === 'ordersCount' && 'Orders'}
              {key === 'wholesaleLeadsCount' && 'Wholesale'}
              {key === 'marketOpportunityScore' && 'Opportunity Score'}
            </button>
          ))}
        </div>
      </div>

      {/* State Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedStateFilter('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedStateFilter === 'ALL'
              ? 'bg-[#c5a059] text-[#0f2d22]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All India ({metrics.length})
        </button>
        {INDIAN_STATES_AND_UTS.map((st) => {
          const count = metrics.filter((m) => m.state.toLowerCase() === st.name.toLowerCase()).length;
          return (
            <button
              key={st.code}
              onClick={() => setSelectedStateFilter(st.name)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStateFilter.toLowerCase() === st.name.toLowerCase()
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st.name} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Regional Cards View */}
      {filteredMetrics.length === 0 ? (
        <div className="p-12 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#e8e2d5]">
          <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="font-bold text-gray-700 text-sm">No verified market data available yet for this filter.</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Growth AI records market telemetry when WhatsApp orders or wholesale enquiries are received from this region.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map((m) => (
            <Link
              key={m.id}
              href={`/admin/growth/markets/${m.marketId}`}
              className="bg-[#fdfbf7] p-5 rounded-xl border border-[#e8e2d5] hover:border-[#1b4332] hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif-heading font-bold text-[#0f2d22] text-base group-hover:text-[#1b4332]">
                      {m.marketName}
                    </h4>
                    <p className="text-xs text-[#626c66] mt-0.5">{m.state} • India</p>
                  </div>
                  <FreshnessBadge tier={m.sourceTier} />
                </div>

                <div className="mt-4 pt-3 border-t border-[#e8e2d5] grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-[#626c66]">Revenue</p>
                    <p className="font-bold text-[#0f2d22] text-sm mt-0.5">₹{m.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#626c66]">Orders</p>
                    <p className="font-bold text-[#0f2d22] text-sm mt-0.5">{m.ordersCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#626c66]">Wholesale Leads</p>
                    <p className="font-bold text-[#0f2d22] text-sm mt-0.5">{m.wholesaleLeadsCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#626c66]">Opp. Score</p>
                    <p className="font-extrabold text-[#1b4332] text-sm mt-0.5">{m.marketOpportunityScore}/100</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-[#1b4332] group-hover:underline">
                <span>View Market Intelligence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
