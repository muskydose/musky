import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import {
  TrendingUp,
  MapPin,
  Search,
  Users,
  Award,
  Database,
  Building2,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Package,
  ShoppingBag,
  Cpu,
} from 'lucide-react';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { getMarketMetrics, getLeads, getRecommendations, getDataSources } from '@/lib/growth/growth-db';
import { getOrdersForAnalytics } from '@/lib/db/orders';
import { getWholesaleEnquiries } from '@/lib/db/wholesale';
import { FirstPartyDataSourceAdapter } from '@/lib/growth/sources/first-party-adapter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Musky Growth AI | Micro Market Intelligence & CRM',
};

export default async function GrowthOverviewPage() {
  const metrics = await getMarketMetrics();
  const leads = await getLeads();
  const recommendations = await getRecommendations();
  const dataSources = await getDataSources();
  const orders = await getOrdersForAnalytics();
  const wholesale = await getWholesaleEnquiries();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const newLeadsCount = leads.filter((l) => l.status === 'New').length + wholesale.length;
  const topMarket = [...metrics].sort((a, b) => b.revenue - a.revenue)[0] || null;
  const highestOppMarket = [...metrics].sort((a, b) => b.marketOpportunityScore - a.marketOpportunityScore)[0] || null;

  return (
    <AdminLayout title="Musky Growth AI — Market Intelligence">
      {/* Top Banner Notice */}
      <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-[#1b4332] text-[#c5a059] shrink-0 mt-0.5">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-heading font-bold text-xl text-white">
                Musky Growth AI Intelligence Center
              </h3>
              <FreshnessBadge tier="VERIFIED" />
            </div>
            <p className="text-xs text-[#b2c8be] mt-1 max-w-2xl">
              Real-data micro-market analytics, regional demand mapping, wholesale lead management, and evidence-backed growth recommendations derived directly from Musky Dose store activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/growth/imports"
            className="inline-flex items-center gap-1.5 bg-[#c5a059] text-[#0f2d22] px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs hover:bg-[#d4af66] shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Dataset</span>
          </Link>
        </div>
      </div>

      {/* Primary Verified Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Verified Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
                Store Revenue
              </p>
              <FreshnessBadge tier="VERIFIED" showIcon={false} />
            </div>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              ₹{totalRevenue.toLocaleString()}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              From {orders.length} verified WhatsApp order(s)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#e8f3ed] text-[#1b4332] flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Customers & Leads */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
                Wholesale Leads
              </p>
              <FreshnessBadge tier="VERIFIED" showIcon={false} />
            </div>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {newLeadsCount}
            </h3>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              {wholesale.length} Wholesale + {leads.length} CRM Leads
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#faf5e8] text-[#c5a059] flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Top Performing Market */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
                Top Market
              </p>
              <FreshnessBadge tier="DERIVED" showIcon={false} />
            </div>
            <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22] mt-1 truncate max-w-[150px]">
              {topMarket ? topMarket.marketName : 'No Verified Data'}
            </h3>
            <p className="text-[11px] text-[#626c66] font-medium mt-1">
              {topMarket ? `₹${topMarket.revenue.toLocaleString()} revenue` : 'No orders recorded'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#e8f3ed] text-[#1b4332] flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        {/* Highest Opportunity Score */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
                Top Opportunity
              </p>
              <FreshnessBadge tier="DERIVED" showIcon={false} />
            </div>
            <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22] mt-1 truncate max-w-[150px]">
              {highestOppMarket ? highestOppMarket.marketName : 'No Verified Data'}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {highestOppMarket ? `Score: ${highestOppMarket.marketOpportunityScore}/100` : 'No verified market score'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#faf5e8] text-[#c5a059] flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Link href="/admin/growth/analytics" className="bg-[#e8f3ed] p-4 rounded-xl border border-[#1b4332]/40 shadow-xs hover:border-[#1b4332] transition-all text-center group">
          <TrendingUp className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Conversion Funnel</span>
          <span className="text-[10px] text-emerald-800 font-semibold">Store Analytics</span>
        </Link>
        <Link href="/admin/growth/markets" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <MapPin className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Market Master</span>
          <span className="text-[10px] text-gray-500">{metrics.length} Markets</span>
        </Link>
        <Link href="/admin/growth/map" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <TrendingUp className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">India Heatmap</span>
          <span className="text-[10px] text-gray-500">Interactive Map</span>
        </Link>
        <Link href="/admin/growth/products" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Package className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Product Demand</span>
          <span className="text-[10px] text-gray-500">Regional Matrix</span>
        </Link>
        <Link href="/admin/growth/campaigns" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <ShoppingBag className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Campaigns</span>
          <span className="text-[10px] text-gray-500">Ad Spend Status</span>
        </Link>
        <Link href="/admin/growth/leads" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Building2 className="w-6 h-6 text-[#c5a059] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Lead CRM</span>
          <span className="text-[10px] text-gray-500">{newLeadsCount} Leads</span>
        </Link>
        <Link href="/admin/growth/competitors" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Users className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Competitors</span>
          <span className="text-[10px] text-gray-500">Observations</span>
        </Link>
        <Link href="/admin/growth/keywords" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Search className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Keywords</span>
          <span className="text-[10px] text-gray-500">Search Demand</span>
        </Link>
        <Link href="/admin/growth/recommendations" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Cpu className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">AI Advice</span>
          <span className="text-[10px] text-gray-500">{recommendations.length} Proofs</span>
        </Link>
        <Link href="/admin/growth/data-sources" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Database className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Data Sources</span>
          <span className="text-[10px] text-gray-500">{dataSources.length} Sources</span>
        </Link>
        <Link href="/admin/growth/imports" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <FileSpreadsheet className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">CSV Importer</span>
          <span className="text-[10px] text-gray-500">RFC 4180</span>
        </Link>
        <Link href="/admin/growth/settings" className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs hover:border-[#1b4332] hover:shadow-xs transition-all text-center group">
          <Settings className="w-6 h-6 text-[#1b4332] mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xs text-[#0f2d22] block">Settings</span>
          <span className="text-[10px] text-gray-500">Scoring Weights</span>
        </Link>
      </div>

      {/* Main Section: Recommendations & Regional Market Ranks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Evidence Recommendations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8e2d5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1b4332]" />
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                  Evidence-Based Recommendations
                </h3>
              </div>
              <p className="text-xs text-[#626c66] mt-0.5">
                Calculated purely from stored store activity and verified enquiry metrics
              </p>
            </div>
            <Link href="/admin/growth/recommendations" className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <div className="p-8 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#e8e2d5]">
              <p className="text-xs text-gray-600 font-semibold">No verified data available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="bg-[#fdfbf7] p-5 rounded-xl border border-[#e8e2d5] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-[#0f2d22] text-sm">{rec.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[#333] leading-relaxed">{rec.reason}</p>
                  <div className="pt-2 border-t border-[#e8e2d5] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rec.supportingMetrics.map((sm, i) => (
                        <span key={i} className="text-[11px] text-[#626c66]">
                          <strong>{sm.label}:</strong> {sm.value}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={rec.recommendedActions[0]?.link || '/admin/growth/recommendations'}
                      className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Freshness & Source Status */}
        <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-4">
            <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
              Data Sources Freshness
            </h3>
            <Link href="/admin/growth/data-sources" className="text-xs font-bold text-[#1b4332] hover:underline">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {dataSources.map((ds) => (
              <div key={ds.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-[#0f2d22]">{ds.name}</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Records: {ds.recordsCount} • Last Sync: {ds.lastSyncedAt ? new Date(ds.lastSyncedAt).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
                <FreshnessBadge status={ds.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
