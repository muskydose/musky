'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Eye,
  ShoppingBag,
  ShoppingCart,
  CheckCircle2,
  MessageCircle,
  Building2,
  Search,
  ArrowRight,
  ArrowDown,
  Calendar,
  RefreshCw,
  Loader2,
  Percent,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface FunnelData {
  periodDays: number;
  visitors: number;
  pageViews: number;
  productViews: number;
  addToCarts: number;
  cartViews: number;
  checkoutStarts: number;
  orders: number;
  totalRevenue: number;
  whatsappClicks: number;
  wholesaleInquiries: number;
  rates: {
    productViewRate: number;
    cartRate: number;
    checkoutRate: number;
    orderConversionRate: number;
    overallConversionRate: number;
  };
}

interface ProductFunnelItem {
  id: string;
  name: string;
  views: number;
  addToCart: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  cartRate: number;
}

interface SearchInsights {
  topSearches: Array<{ query: string; count: number; lastResultCount: number }>;
  zeroResultSearches: Array<{ query: string; count: number; lastResultCount: number }>;
  totalSearches: number;
}

interface WhatsAppStat {
  source: string;
  clicks: number;
}

export default function GrowthAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [productFunnel, setProductFunnel] = useState<ProductFunnelItem[]>([]);
  const [searchInsights, setSearchInsights] = useState<SearchInsights | null>(null);
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppStat[]>([]);

  const fetchAnalytics = async (selectedDays: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/growth/analytics?view=funnel&days=${selectedDays}`);
      const data = await res.json();

      if (data?.success) {
        setFunnel(data.funnel);
        setProductFunnel(data.productFunnel || []);
        setSearchInsights(data.searchInsights || null);
        setWhatsappStats(data.whatsappStats || []);
      } else {
        setError(data?.error || 'Failed to load conversion analytics.');
      }
    } catch (err: any) {
      console.warn('Analytics fetch error:', err);
      setError('Unable to load analytics data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(days);
  }, [days]);

  const handlePeriodChange = (newDays: number) => {
    setDays(newDays);
  };

  return (
    <AdminLayout title="Customer Funnel & Conversion Analytics">
      <div className="space-y-6">
        {/* Header with Date Filter */}
        <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f]/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b4332] text-[#c5a059] border border-[#c5a059]/30 text-xs font-bold uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Conversion Funnel Intelligence</span>
            </div>
            <h2 className="font-serif-heading text-2xl font-bold text-white">
              Customer Journey & Conversion Drop-off
            </h2>
            <p className="text-xs text-[#b2c8be] mt-1 max-w-xl">
              Track real-time visitor progression from product discovery to WhatsApp inquiries and completed checkout orders.
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-[#1b4332] p-1 rounded-xl border border-[#2d6a4f] shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handlePeriodChange(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                days === 1
                  ? 'bg-[#c5a059] text-[#0f2d22] shadow-xs'
                  : 'text-[#e8f3ed] hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                days === 7
                  ? 'bg-[#c5a059] text-[#0f2d22] shadow-xs'
                  : 'text-[#e8f3ed] hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                days === 30
                  ? 'bg-[#c5a059] text-[#0f2d22] shadow-xs'
                  : 'text-[#e8f3ed] hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange(90)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                days === 90
                  ? 'bg-[#c5a059] text-[#0f2d22] shadow-xs'
                  : 'text-[#e8f3ed] hover:text-white'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchAnalytics(days)}
              className="font-bold underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 rounded-2xl bg-white border border-[#e8e2d5] text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1b4332] mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Aggregating conversion funnel data...</p>
          </div>
        ) : (
          <>
            {/* Top High-Level Metrics Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#e8e2d5] shadow-xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Unique Visitors
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22] mt-1 block">
                  {funnel?.visitors || 0}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  {funnel?.pageViews || 0} Total Page Views
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#e8e2d5] shadow-xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Verified Store Orders
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-1 block">
                  {funnel?.orders || 0}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                  ₹{(funnel?.totalRevenue || 0).toLocaleString()} Verified Value
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#e8e2d5] shadow-xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Overall Conversion Rate
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1b4332] mt-1 block">
                  {funnel?.rates.overallConversionRate || 0}%
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Visitor → Order Completion
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#e8e2d5] shadow-xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Wholesale & WhatsApp Actions
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#c5a059] mt-1 block">
                  {(funnel?.whatsappClicks || 0) + (funnel?.wholesaleInquiries || 0)}
                </span>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {funnel?.whatsappClicks || 0} WhatsApp + {funnel?.wholesaleInquiries || 0} Wholesale
                </span>
              </div>
            </div>

            {/* Visual Conversion Funnel Card */}
            <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#e8e2d5] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
                    Customer Conversion Funnel
                  </h3>
                  <p className="text-xs text-[#626c66]">
                    Step-by-step drop-off analysis across the customer purchase journey.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-gray-400">
                  Last {days} Day(s)
                </span>
              </div>

              <div className="space-y-3 max-w-4xl mx-auto">
                {/* Step 1: Visitors */}
                <div className="p-4 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0f2d22] text-[#c5a059] flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0f2d22]">Store Visitors</h4>
                      <p className="text-[10px] text-gray-500">Total unique customer sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#0f2d22]">{funnel?.visitors || 0}</span>
                    <span className="text-[10px] text-gray-400 block">100% Entry</span>
                  </div>
                </div>

                {/* Dropdown Indicator */}
                <div className="flex justify-center -my-1 text-gray-400">
                  <ArrowDown className="w-4 h-4 text-emerald-700" />
                </div>

                {/* Step 2: Product Views */}
                <div className="p-4 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#143d2e] text-[#c5a059] flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0f2d22]">Product Detail Views</h4>
                      <p className="text-[10px] text-gray-500">Shoppers viewing specific botanical items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#0f2d22]">{funnel?.productViews || 0}</span>
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      {funnel?.rates.productViewRate || 0}% of Visitors
                    </span>
                  </div>
                </div>

                {/* Dropdown Indicator */}
                <div className="flex justify-center -my-1 text-gray-400">
                  <ArrowDown className="w-4 h-4 text-emerald-700" />
                </div>

                {/* Step 3: Add to Cart */}
                <div className="p-4 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1b4332] text-[#c5a059] flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0f2d22]">Added to Cart</h4>
                      <p className="text-[10px] text-gray-500">Items added to shopping bag</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#0f2d22]">{funnel?.addToCarts || 0}</span>
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      {funnel?.rates.cartRate || 0}% from Views
                    </span>
                  </div>
                </div>

                {/* Dropdown Indicator */}
                <div className="flex justify-center -my-1 text-gray-400">
                  <ArrowDown className="w-4 h-4 text-emerald-700" />
                </div>

                {/* Step 4: Checkout Started */}
                <div className="p-4 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#245741] text-[#c5a059] flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0f2d22]">Checkout Started</h4>
                      <p className="text-[10px] text-gray-500">Initiated delivery address entry</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#0f2d22]">{funnel?.checkoutStarts || 0}</span>
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      {funnel?.rates.checkoutRate || 0}% from Cart
                    </span>
                  </div>
                </div>

                {/* Dropdown Indicator */}
                <div className="flex justify-center -my-1 text-gray-400">
                  <ArrowDown className="w-4 h-4 text-emerald-700" />
                </div>

                {/* Step 5: Completed Orders */}
                <div className="p-4 rounded-xl bg-[#e8f3ed] border border-[#1b4332]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1b4332] text-white flex items-center justify-center font-bold text-xs">
                      5
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0f2d22]">Confirmed Orders</h4>
                      <p className="text-[10px] text-gray-500">Verified orders captured in database</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-emerald-800">{funnel?.orders || 0}</span>
                    <span className="text-[10px] text-emerald-800 font-bold block">
                      {funnel?.rates.orderConversionRate || 0}% Checkout Completion
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Performance & Conversion Table */}
            <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 shadow-xs space-y-4">
              <div className="border-b border-[#e8e2d5] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
                    Product Conversion Breakdown
                  </h3>
                  <p className="text-xs text-[#626c66]">
                    Views, cart additions, verified orders, and conversion rate per product.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {productFunnel.length} Products
                </span>
              </div>

              {productFunnel.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center italic">
                  No product activity recorded in this time period yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e8e2d5] text-gray-500 uppercase font-bold text-[10px]">
                        <th className="pb-2.5">Product</th>
                        <th className="pb-2.5 text-center">Views</th>
                        <th className="pb-2.5 text-center">Cart Adds</th>
                        <th className="pb-2.5 text-center">Cart Rate</th>
                        <th className="pb-2.5 text-center">Orders</th>
                        <th className="pb-2.5 text-center">Conversion</th>
                        <th className="pb-2.5 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {productFunnel.map((p) => (
                        <tr key={p.id} className="hover:bg-[#fcfbf7]">
                          <td className="py-2.5 font-bold text-[#0f2d22] max-w-[200px] truncate">
                            {p.name}
                          </td>
                          <td className="py-2.5 text-center text-gray-600">{p.views}</td>
                          <td className="py-2.5 text-center text-gray-600">{p.addToCart}</td>
                          <td className="py-2.5 text-center text-gray-600">{p.cartRate}%</td>
                          <td className="py-2.5 text-center font-bold text-emerald-800">{p.orders}</td>
                          <td className="py-2.5 text-center font-bold text-[#1b4332]">
                            {p.conversionRate}%
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-[#0f2d22]">
                            ₹{p.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Search Intelligence & WhatsApp Attribution Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search Demand Insights */}
              <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 shadow-xs space-y-4">
                <div className="border-b border-[#e8e2d5] pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#1b4332]" />
                    <h3 className="font-serif-heading text-base font-bold text-[#0f2d22]">
                      Search Demand Insights
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {searchInsights?.totalSearches || 0} Total Searches
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                      Top Searched Terms
                    </h4>
                    {!searchInsights?.topSearches || searchInsights.topSearches.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No search records captured yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {searchInsights.topSearches.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold text-[#0f2d22]"
                          >
                            <span>{s.query}</span>
                            <span className="text-[10px] bg-[#e8f3ed] text-[#1b4332] px-1.5 py-0.2 rounded font-mono font-bold">
                              {s.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {searchInsights?.zeroResultSearches && searchInsights.zeroResultSearches.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <h4 className="text-[11px] font-bold text-rose-700 uppercase mb-1.5">
                        Zero-Result Searches (Catalog Opportunities)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {searchInsights.zeroResultSearches.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-900"
                          >
                            <span>{s.query}</span>
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">
                              {s.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp Conversion Sources */}
              <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 shadow-xs space-y-4">
                <div className="border-b border-[#e8e2d5] pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-serif-heading text-base font-bold text-[#0f2d22]">
                      WhatsApp CTA Attribution
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {funnel?.whatsappClicks || 0} Total Clicks
                  </span>
                </div>

                {whatsappStats.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No WhatsApp clicks recorded in this period.</p>
                ) : (
                  <div className="space-y-2">
                    {whatsappStats.map((stat, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[#0f2d22]">{stat.source}</span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {stat.clicks} {stat.clicks === 1 ? 'click' : 'clicks'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
