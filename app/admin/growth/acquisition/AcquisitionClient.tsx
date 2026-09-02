'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AcquisitionDashboardMetrics,
  ProductAcquisitionReadiness,
  MerchantFeedHealthSummary,
  GrowthOpportunity,
} from '@/lib/growth/types';
import {
  Users,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Search,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Layers,
  MapPin,
  ChevronRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function AcquisitionClient() {
  const [metrics, setMetrics] = useState<AcquisitionDashboardMetrics | null>(null);
  const [readinessList, setReadinessList] = useState<ProductAcquisitionReadiness[]>([]);
  const [feedSummary, setFeedSummary] = useState<MerchantFeedHealthSummary | null>(null);
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'NEEDS_REVIEW'>('ALL');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/growth/acquisition');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics || null);
          setReadinessList(data.readinessList || []);
          setFeedSummary(data.feedSummary || null);
          setOpportunities(data.opportunities || []);
        }
      }
    } catch (err) {
      console.error('Failed to load acquisition data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = readinessList.filter((p) => {
    if (statusFilter === 'READY' && p.feedStatus !== 'FEED_READY') return false;
    if (statusFilter === 'NEEDS_REVIEW' && p.feedStatus !== 'FEED_NEEDS_REVIEW') return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return p.productName.toLowerCase().includes(q) || p.productSlug.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-heading font-bold text-2xl text-[#0f2d22]">
              Lead Acquisition Engine
            </h1>
            <span className="bg-[#e8f5e9] text-[#1b4332] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#c8e6c9]">
              PRIMARY KPI: QUALIFIED LEADS
            </span>
          </div>
          <p className="text-xs text-[#626c66] mt-1">
            Google Organic Search Coverage, Merchant Center Free Listings, Local Sojat Intent & Commercial Acquisition
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4efe6] text-[#1b4332] rounded-xl text-xs font-bold hover:bg-[#e8e2d5] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Signals
          </button>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0f2d22] transition-colors shadow-xs"
          >
            <Users className="w-4 h-4" />
            View Lead Center
          </Link>
        </div>
      </div>

      {/* Top Headline KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-[#626c66] uppercase tracking-wider block">Total Leads</span>
          <span className="text-xl font-bold text-[#0f2d22] mt-1 block">{metrics?.totalLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Leads Today</span>
          <span className="text-xl font-bold text-blue-900 mt-1 block">{metrics?.leadsToday ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Qualified</span>
          <span className="text-xl font-bold text-indigo-900 mt-1 block">{metrics?.qualifiedLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">High Intent</span>
          <span className="text-xl font-bold text-amber-900 mt-1 block">{metrics?.highIntentLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Organic Leads</span>
          <span className="text-xl font-bold text-teal-900 mt-1 block">{metrics?.organicLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">WhatsApp</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{metrics?.whatsappLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Wholesale</span>
          <span className="text-xl font-bold text-purple-900 mt-1 block">{metrics?.wholesaleLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-[#626c66] uppercase tracking-wider block">Lead Rate</span>
          <span className="text-xl font-bold text-[#0f2d22] mt-1 block">{metrics?.leadRate ?? 0}%</span>
        </div>
      </div>

      {/* Google Merchant Center Free Listings Diagnostic Card */}
      {feedSummary && (
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
                  Google Merchant Center Free Listings Feed (India / INR)
                </h3>
                <p className="text-xs text-[#626c66]">
                  Compliant RSS 2.0 XML product feed for Google Free Listings & Shopping Surface
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(feedSummary.feedXmlUrl);
                  setCopiedFeed(true);
                  setTimeout(() => setCopiedFeed(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4efe6] text-[#1b4332] rounded-xl text-xs font-bold hover:bg-[#e8e2d5] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedFeed ? 'Copied XML URL!' : 'Copy Feed URL'}
              </button>
              <a
                href={feedSummary.feedXmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#0f2d22] transition-colors shadow-xs"
              >
                <FileCode className="w-3.5 h-3.5" />
                Inspect XML
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
            <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Total Products</span>
              <span className="font-bold text-[#0f2d22] text-sm mt-0.5 block">{feedSummary.totalProducts}</span>
            </div>
            <div className="bg-[#e8f5e9] p-3 rounded-xl border border-[#c8e6c9]">
              <span className="text-emerald-800 block text-[10px] uppercase font-bold">Feed Ready</span>
              <span className="font-bold text-emerald-900 text-sm mt-0.5 block">{feedSummary.feedReadyCount}</span>
            </div>
            <div className="bg-[#fff8e1] p-3 rounded-xl border border-[#ffe082]">
              <span className="text-amber-800 block text-[10px] uppercase font-bold">Needs Review</span>
              <span className="font-bold text-amber-900 text-sm mt-0.5 block">{feedSummary.needsReviewCount}</span>
            </div>
            <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Missing Image</span>
              <span className="font-bold text-[#0f2d22] text-sm mt-0.5 block">{feedSummary.missingImageCount}</span>
            </div>
            <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Missing Price</span>
              <span className="font-bold text-[#0f2d22] text-sm mt-0.5 block">{feedSummary.missingPriceCount}</span>
            </div>
            <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Invalid URL</span>
              <span className="font-bold text-[#0f2d22] text-sm mt-0.5 block">{feedSummary.invalidUrlCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Acquisition Opportunities Stream */}
      {opportunities.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
                Lead Acquisition Opportunities ({opportunities.length})
              </h3>
            </div>
            <Link
              href="/admin/growth/opportunities"
              className="text-xs font-bold text-[#1b4332] hover:underline inline-flex items-center gap-1"
            >
              Action Center <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-[#fcfbf9] p-4 rounded-xl border border-[#e8e2d5] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[#0f2d22]">{opp.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Score: {opp.growthScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#626c66] mt-1 leading-relaxed">{opp.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#e8e2d5] text-[11px]">
                  <span className="text-[#626c66] font-mono">Query: {opp.keyword}</span>
                  <Link
                    href="/admin/growth/opportunities"
                    className="text-[#1b4332] font-bold hover:underline"
                  >
                    Execute Action →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Acquisition Readiness Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
              Product Acquisition Readiness Matrix
            </h3>
            <p className="text-xs text-[#626c66]">
              Deterministic 0–100 audit across search coverage, images, Merchant feed, and CTA readiness
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(['ALL', 'READY', 'NEEDS_REVIEW'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#1b4332] text-white'
                      : 'bg-[#f4efe6] text-[#626c66] hover:bg-[#e8e2d5]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-60">
              <Search className="w-3.5 h-3.5 text-[#626c66] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalog products..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.productId}
              className="bg-[#fcfbf9] p-4 rounded-xl border border-[#e8e2d5] space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border ${
                      prod.readinessScore >= 80
                        ? 'bg-[#e8f5e9] text-emerald-900 border-[#c8e6c9]'
                        : prod.readinessScore >= 60
                        ? 'bg-[#fff8e1] text-amber-900 border-[#ffe082]'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    {prod.readinessScore}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0f2d22]">{prod.productName}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.feedStatus === 'FEED_READY'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {prod.feedStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#626c66] mt-0.5">
                      <span>Lead Potential: {prod.leadPotentialScore}/100</span>
                      <span>•</span>
                      <span>Recommended CTA: {prod.recommendedCta}</span>
                      <span>•</span>
                      <a
                        href={prod.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1b4332] hover:underline inline-flex items-center gap-0.5"
                      >
                        View Page <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/admin/products/${prod.productId}`}
                  className="px-3 py-1.5 bg-[#f4efe6] text-[#1b4332] rounded-lg text-xs font-bold hover:bg-[#e8e2d5] transition-colors self-start md:self-auto"
                >
                  Edit Product
                </Link>
              </div>

              {/* Missing Items & Search Queries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2 border-t border-[#e8e2d5]">
                <div>
                  <span className="font-bold text-[#0f2d22] block text-[11px]">Commercial Intent Map:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prod.commercialIntentCoverage.slice(0, 4).map((q, i) => (
                      <span
                        key={i}
                        className="bg-white px-2 py-0.5 rounded border border-[#e8e2d5] text-[10px] text-[#626c66]"
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-[#0f2d22] block text-[11px]">
                    {prod.missingItems.length === 0 ? 'Diagnostic Status:' : 'Actionable Items:'}
                  </span>
                  {prod.missingItems.length === 0 ? (
                    <span className="text-emerald-700 text-[11px] font-bold block mt-1">
                      ✓ All Google Search & Merchant Center criteria satisfied.
                    </span>
                  ) : (
                    <ul className="text-amber-800 text-[10px] list-disc list-inside mt-1 space-y-0.5">
                      {prod.missingItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

